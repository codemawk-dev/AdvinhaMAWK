import { DateTime } from 'luxon';
import { Prisma, type PrismaClient } from '@prisma/client';
export type RankingPeriod = 'daily' | 'weekly' | 'all-time';
export function periodStart(period: RankingPeriod, now = new Date()): Date | null {
  const local = DateTime.fromJSDate(now, { zone: 'America/Sao_Paulo' });
  return period === 'all-time' ? null : local.startOf(period === 'daily' ? 'day' : 'week').toJSDate();
}
export class RankingRepository {
  constructor(private db: PrismaClient) {}
  async list(period: RankingPeriod) {
    const since = periodStart(period);
    const rows = await this.db.$queryRaw<{ playerId: string; displayName: string; score: number }[]>(Prisma.sql`
      SELECT u.id AS "playerId", u."displayName", MAX(g.score)::integer AS score
      FROM "Game" g JOIN "User" u ON u.id = g."userId"
      WHERE g.status = 'COMPLETED' AND g."totalRounds" = 10
      ${since ? Prisma.sql`AND g."completedAt" >= ${since}` : Prisma.empty}
      GROUP BY u.id, u."displayName" ORDER BY score DESC, u.id ASC LIMIT 100
    `);
    return { period, timezone: 'America/Sao_Paulo', rounds: 10, entries: rows.map((row, index) => ({ position: index + 1, ...row })) };
  }
}
