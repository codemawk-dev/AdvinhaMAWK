import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { adminGuard } from '../core/auth.js';
import type { Config } from '../core/config.js';
import type { CatalogService } from './service.js';
import { normalizeName } from './normalization.js';
import { AppError } from '../core/errors.js';
const paging = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict();
const artistFields = z.object({
  name: z.string().trim().min(1).max(160), categoryId: z.string().min(1).max(60),
  aliases: z.array(z.string().trim().min(1).max(160)).max(15),
  appleArtistId: z.string().regex(/^\d+$/).nullable().optional(),
  active: z.boolean(), catalogPriority: z.number().int().min(1).max(10),
}).strict();
export async function catalogRoutes(app: FastifyInstance, db: PrismaClient, catalog: CatalogService, config: Config) {
  app.addHook('onRequest', adminGuard(config));
  app.post('/catalog/sync', async () => catalog.syncBatch());
  app.get('/catalog/status', async () => catalog.status());
  app.get('/categories', async () => db.internalCategory.findMany({ orderBy: { id: 'asc' } }));
  app.get('/songs', async request => {
    const { page, limit } = paging.parse(request.query);
    return { page, limit, items: await db.song.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { id: 'asc' }, include: { artist: true } }) };
  });
  app.patch('/songs/:id', async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const body = z.object({ popularityWeight: z.number().min(0.2).max(5).optional(), difficultyWeight: z.number().min(0.8).max(1.2).optional(),
      originalYear: z.number().int().min(1900).max(new Date().getUTCFullYear()).nullable().optional(), active: z.boolean().optional() }).strict().parse(request.body);
    return db.song.update({ where: { id }, data: body });
  });
  app.get('/artists', async request => {
    const { page, limit } = paging.parse(request.query);
    return { page, limit, items: await db.artist.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' } }) };
  });
  app.post('/artists', async (request, reply) => {
    const body = artistFields.extend({ aliases: artistFields.shape.aliases.default([]), active: artistFields.shape.active.default(true), catalogPriority: artistFields.shape.catalogPriority.default(1) }).parse(request.body);
    if (!(await db.internalCategory.findUnique({ where: { id: body.categoryId } }))) throw new AppError(400, 'INVALID_CATEGORY', 'Categoria administrativa não encontrada.');
    return reply.code(201).send(await db.artist.create({ data: { ...body, normalizedName: normalizeName(body.name) } }));
  });
  app.patch('/artists/:id', async request => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const body = artistFields.partial().parse(request.body);
    if (body.categoryId && !(await db.internalCategory.findUnique({ where: { id: body.categoryId } }))) throw new AppError(400, 'INVALID_CATEGORY', 'Categoria administrativa não encontrada.');
    return db.artist.update({ where: { id }, data: { ...body, ...(body.name ? { normalizedName: normalizeName(body.name) } : {}), nextSyncAt: new Date() } });
  });
}
