import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from './errors.js';
import type { Config } from './config.js';
declare module '@fastify/jwt' {
  interface FastifyJWT { payload: { sub: string; kind: 'anonymous' }; user: { sub: string; kind: 'anonymous' } }
}
export async function authenticate(request: FastifyRequest): Promise<string> {
  try {
    await request.jwtVerify();
    if (request.user.kind !== 'anonymous' || !z.uuid().safeParse(request.user.sub).success) throw new Error();
    return request.user.sub;
  } catch { throw new AppError(401, 'UNAUTHORIZED', 'Sessão ausente, inválida ou expirada.'); }
}
export function adminGuard(config: Config) {
  return async (request: FastifyRequest) => {
    const supplied = request.headers['x-admin-key'];
    const hash = (value: string) => createHash('sha256').update(value).digest();
    if (typeof supplied !== 'string' || !timingSafeEqual(hash(supplied), hash(config.ADMIN_API_KEY))) throw new AppError(401, 'ADMIN_UNAUTHORIZED', 'Credencial administrativa inválida.');
  };
}
export async function createSession(app: FastifyInstance, db: PrismaClient, displayName = 'Jogador') {
  const user = await db.user.create({ data: { displayName } });
  const accessToken = app.jwt.sign({ sub: user.id, kind: 'anonymous' }, { expiresIn: '30d' });
  return { userId: user.id, accessToken };
}
