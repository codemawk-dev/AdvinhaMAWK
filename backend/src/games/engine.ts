import type { Artist, Song } from '@prisma/client';
import { random, weighted, type Random } from '../core/random.js';
import { AppError } from '../core/errors.js';
export type PlayableSong = Song & { artist: Artist };
export function decade(song: PlayableSong): number {
  const year = song.originalYear ?? song.releaseDate?.getUTCFullYear();
  return year ? Math.floor(year / 10) * 10 : 0;
}
export class GameSelectionService {
  constructor(private rng: Random = random) {}
  select(pool: PlayableSong[], rounds: number, recent: Set<string>): PlayableSong[] {
    const selected: PlayableSong[] = [];
    const artists = new Set<string>();
    const titles = new Set<string>();
    const categories = new Map<string, number>();
    const decades = new Map<number, number>();
    const available = pool.filter(song => song.active && song.artist.active);
    if (new Set(available.map(s => s.normalizedTitle)).size < rounds) {
      throw new AppError(409, 'CATALOG_TOO_SMALL', 'Não há músicas suficientes para esta combinação. Amplie os estilos ou o período e tente novamente.');
    }
    for (let index = 0; index < rounds; index++) {
      let candidates = available.filter(song => !titles.has(song.normalizedTitle) && !selected.some(s => s.id === song.id));
      const freshArtists = candidates.filter(s => !artists.has(s.artistId));
      if (freshArtists.length) candidates = freshArtists;
      const diverse = candidates.filter(s => (categories.get(s.artist.categoryId) ?? 0) < 2);
      if (diverse.length) candidates = diverse;
      const song = weighted(candidates, candidate => {
        const groupPenalty = 1 / (1 + (categories.get(candidate.artist.categoryId) ?? 0) * 4);
        const eraPenalty = 1 / (1 + (decades.get(decade(candidate)) ?? 0) * 2);
        const recency = recent.has(candidate.id) ? 0.08 : 1;
        const familiarity = Math.max(0.2, Math.min(5, candidate.popularityWeight));
        // Alternate familiar and medium selections without user-selected difficulty.
        return (index % 3 === 2 ? Math.sqrt(familiarity) : familiarity) * groupPenalty * eraPenalty * recency;
      }, this.rng);
      selected.push(song); artists.add(song.artistId); titles.add(song.normalizedTitle);
      categories.set(song.artist.categoryId, (categories.get(song.artist.categoryId) ?? 0) + 1);
      decades.set(decade(song), (decades.get(decade(song)) ?? 0) + 1);
    }
    return selected;
  }
}
