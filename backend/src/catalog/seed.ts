import type { PrismaClient } from '@prisma/client';
import { artistAliases, artistGroups } from './artists.js';
import { normalizeName } from './normalization.js';
export async function seedArtists(db: PrismaClient): Promise<number> {
  let count = 0;
  for (const [id, group] of Object.entries(artistGroups)) {
    await db.internalCategory.upsert({ where: { id }, create: { id, name: group.name }, update: {} });
    for (const [index, name] of group.artists.entries()) {
      await db.artist.upsert({ where: { normalizedName: normalizeName(name) }, update: {}, create: {
        name, normalizedName: normalizeName(name), categoryId: id,
        aliases: artistAliases[name] ?? [], catalogPriority: index < 8 ? 3 : 1,
      } });
      count++;
    }
  }
  return count;
}
