import type { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '../core/errors.js';
export type GameTransaction = Prisma.TransactionClient;
export class GameRepository {
  constructor(private db: PrismaClient) {}
  async transaction<T>(gameId: string, userId: string, work: (tx: GameTransaction) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      // Row locking serializes submissions AND repeated GET /round calls across API instances.
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Game" WHERE id = ${gameId}::uuid AND "userId" = ${userId}::uuid FOR UPDATE`;
      if (!rows.length) throw new AppError(404, 'GAME_NOT_FOUND', 'Partida não encontrada.');
      return work(tx);
    }, { timeout: 10000 });
  }
  create(data: Prisma.GameCreateInput) { return this.db.game.create({ data }); }
  results(gameId: string) {
    return this.db.gameRound.findMany({ where: { gameId }, orderBy: { position: 'asc' },
      select: { position: true, title: true, artistName: true, duration: true, answer: { select: { correct: true, points: true } } } });
  }
  async recent(userId: string): Promise<Set<string>> {
    const games = await this.db.game.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20, select: { rounds: { select: { songId: true } } } });
    return new Set(games.flatMap(g => g.rounds.map(r => r.songId)));
  }
  async summary(id: string, userId: string) {
    const game = await this.db.game.findFirst({ where: { id, userId }, select: {
      id: true, status: true, rulesVersion: true, totalRounds: true, currentRound: true, score: true, streak: true, maxStreak: true, expiresAt: true, completedAt: true,
    } });
    if (!game) throw new AppError(404, 'GAME_NOT_FOUND', 'Partida não encontrada.');
    if (game.status === 'ACTIVE' && (game.expiresAt <= new Date() || game.rulesVersion !== 2)) return { ...game, status: 'EXPIRED' as const };
    return game;
  }
}
