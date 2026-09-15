import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Prisma, PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';
import type { Config } from './core/config.js';
import { AppError } from './core/errors.js';
import { ArtistRepository, SongRepository } from './catalog/repositories.js';
import { ITunesClient, type MusicSearchClient } from './catalog/itunes-client.js';
import { CatalogService } from './catalog/service.js';
import { catalogRoutes } from './catalog/controller.js';
import { GameRepository } from './games/repository.js';
import { GameService } from './games/service.js';
import { gameRoutes } from './games/controller.js';
import { ApplePreviewProvider, type AudioProvider } from './audio/provider.js';
import { RankingRepository, type RankingPeriod } from './rankings/repository.js';
export interface AppDependencies { db?: PrismaClient; audio?: AudioProvider; apple?: MusicSearchClient; logger?: boolean }
export async function buildApp(config: Config, dependencies: AppDependencies = {}) {
  const db = dependencies.db ?? new PrismaClient({ datasourceUrl: config.DATABASE_URL });
  const app = Fastify({ bodyLimit: 16384, logger: dependencies.logger === false ? false : {
    level: config.NODE_ENV === 'test' ? 'silent' : 'info',
    redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers.x-admin-key', 'res.headers.set-cookie'],
  } });
  await app.register(cookie);
  await app.register(jwt, { secret: config.JWT_SECRET, cookie: { cookieName: 'session', signed: false }, sign: { iss: 'advinhasong', aud: 'advinhasong-game' }, verify: { allowedIss: 'advinhasong', allowedAud: 'advinhasong-game', algorithms: ['HS256'] } });
  await app.register(helmet);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.origin) {
      let originHost: string;
      try { originHost = new URL(request.headers.origin).host; } catch { throw new AppError(403, 'INVALID_ORIGIN', 'Origem inválida.'); }
      if (originHost !== request.headers.host) throw new AppError(403, 'INVALID_ORIGIN', 'Origem inválida.');
    }
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Dados inválidos.', issues: error.issues.map(i => ({ path: i.path, message: i.message })) });
    if (error instanceof AppError) return reply.code(error.statusCode).send({ error: error.code, message: error.message });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return reply.code(409).send({ error: 'CONFLICT', message: 'Registro duplicado ou resposta já enviada.' });
      if (error.code === 'P2025') return reply.code(404).send({ error: 'NOT_FOUND', message: 'Registro não encontrado.' });
    }
    const status = typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (status < 500) return reply.code(status).send({ error: 'REQUEST_ERROR', message: status === 429 ? 'Muitas requisições. Tente novamente.' : 'Requisição inválida.' });
    request.log.error({ err: error }, 'request.failed');
    return reply.code(500).send({ error: 'INTERNAL_ERROR', message: 'Erro interno.', requestId: request.id });
  });
  const songs = new SongRepository(db);
  const catalog = new CatalogService(db, new ArtistRepository(db), songs, dependencies.apple ?? new ITunesClient(config.APPLE_REQUEST_DELAY_MS), config, app.log);
  const games = new GameService(new GameRepository(db), songs);
  const rankings = new RankingRepository(db);
  app.get('/health', async (_request, reply) => {
    try { await db.$queryRaw`SELECT 1`; return { status: 'ok', database: 'up' }; }
    catch { return reply.code(503).send({ status: 'unhealthy', database: 'down' }); }
  });
  app.get('/catalog/summary', async () => {
    const [songs, artists, groups] = await Promise.all([
      db.song.count({ where: { active: true, artist: { active: true } } }),
      db.artist.count({ where: { active: true, songs: { some: { active: true } } } }),
      db.internalCategory.count({ where: { artists: { some: { active: true, songs: { some: { active: true } } } } } }),
    ]);
    return { songs, artists, groups };
  });
  gameRoutes(app, games, dependencies.audio ?? new ApplePreviewProvider(config.FFMPEG_PATH), db, config);
  await app.register(async scope => catalogRoutes(scope, db, catalog, config), { prefix: '/admin' });
  app.get('/rankings', async () => rankings.list('all-time'));
  for (const period of ['daily', 'weekly', 'all-time'] satisfies RankingPeriod[]) app.get(`/rankings/${period}`, async () => rankings.list(period));
  if (!dependencies.db) app.addHook('onClose', async () => db.$disconnect());
  return { app, db, catalog };
}
