import { preferencesSchema } from './preferences.js';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { Config } from '../core/config.js';
import { authenticate, createSession } from '../core/auth.js';
import { AppError } from '../core/errors.js';
import type { GameService } from './service.js';
const gameParams = z.object({ gameId: z.uuid() });
export function gameRoutes(app: FastifyInstance, games: GameService, db: PrismaClient, config: Config) {
  const cookie = { httpOnly: true, sameSite: 'strict' as const, secure: config.NODE_ENV === 'production', path: '/', maxAge: 30 * 86400 };
  app.post('/sessions', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = z.object({ displayName: z.string().trim().min(1).max(40).default('Jogador') }).strict().parse(request.body ?? {});
    const session = await createSession(app, db, body.displayName);
    reply.setCookie('session', session.accessToken, cookie);
    return reply.code(201).send(session);
  });
  app.get('/sessions/me', async request => {
    const userId = await authenticate(request);
    const user = await db.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    if (!user) throw new AppError(401, 'INVALID_SESSION', 'Sessão inválida.');
    return { userId, displayName: user.displayName };
  });
  app.post('/games', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = z.object({ rounds: z.number().int().min(1).max(20).default(10), preferences: preferencesSchema.optional() }).strict().parse(request.body ?? {});
    const existing = request.headers.authorization || request.cookies.session;
    const session = existing ? null : await createSession(app, db);
    const userId = session?.userId ?? await authenticate(request);
    if (session) reply.setCookie('session', session.accessToken, cookie);
    const game = await games.create(userId, body.rounds, body.preferences);
    return reply.code(201).send({ ...game, ...(session ? { accessToken: session.accessToken } : {}) });
  });
  app.get('/games/:gameId', async request => {
    const userId = await authenticate(request);
    return games.summary(gameParams.parse(request.params).gameId, userId);
  });
  app.get('/games/:gameId/round', async request => {
    const userId = await authenticate(request);
    return games.round(gameParams.parse(request.params).gameId, userId);
  });
  app.post('/games/:gameId/answer', async request => {
    const userId = await authenticate(request);
    const body = z.object({ roundId: z.uuid(), songId: z.uuid(), attempt: z.number().int().min(0).max(4), revision: z.number().int().min(0) }).strict().parse(request.body);
    return games.answer(gameParams.parse(request.params).gameId, userId, body.roundId, body.songId, body.attempt, body.revision);
  });
  app.post('/games/:gameId/skip', async request => {
    const userId = await authenticate(request);
    const body = z.object({ roundId: z.uuid(), attempt: z.number().int().min(0).max(4), revision: z.number().int().min(0) }).strict().parse(request.body);
    return games.answer(gameParams.parse(request.params).gameId, userId, body.roundId, null, body.attempt, body.revision);
  });
  app.get('/games/:gameId/result', async request => {
    const userId = await authenticate(request);
    return games.result(gameParams.parse(request.params).gameId, userId);
  });
  app.get('/games/:gameId/rounds/:roundId/audio', { config: { rateLimit: { max: 90, timeWindow: '1 minute' } } }, async (request, reply) => {
    const userId = await authenticate(request);
    const { gameId, roundId } = gameParams.extend({ roundId: z.uuid() }).parse(request.params);
    const { attempt, revision } = z.object({ attempt: z.coerce.number().int().min(0).max(4), revision: z.coerce.number().int().min(0) }).strict().parse(request.query);
    const controller = new AbortController();
    const onClose = () => { if (!reply.raw.writableEnded) controller.abort(); };
    reply.raw.once('close', onClose);
    try {
      const clip = await games.audio(gameId, userId, roundId, attempt, revision, controller.signal);
      return reply.header('Content-Type', 'audio/wav').header('Cache-Control', 'private, no-store')
        .header('Accept-Ranges', 'none').send(clip);
    } finally { reply.raw.removeListener('close', onClose); }
  });
}
