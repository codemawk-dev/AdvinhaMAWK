import type { Artist, Song } from '@prisma/client';
import { random, shuffle, weighted, type Random } from '../core/random.js';
import { AppError } from '../core/errors.js';
export type PlayableSong = Song & { artist: Artist };
export const durations = [1, 3, 5, 10, 15] as const;
export type ClipDuration = typeof durations[number];
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
    if (new Set(available.map(s => s.normalizedTitle)).size < Math.max(4, rounds)) {
      throw new AppError(409, 'CATALOG_TOO_SMALL', 'Catálogo insuficiente. Execute npm run catalog:sync.');
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
  durations(rounds: number): ClipDuration[] {
    const values = Array.from({ length: rounds }, (_, i) => durations[i % durations.length]!);
    return shuffle(values, this.rng);
  }
}
export class DistractorService {
  constructor(private rng: Random = random) {}
  options(correct: PlayableSong, pool: PlayableSong[]): { title: string; isCorrect: boolean }[] {
    const chosen = [{ title: correct.title, isCorrect: true }];
    const titles = new Set([correct.normalizedTitle]);
    for (let i = 0; i < 3; i++) {
      const candidates = pool.filter(s => s.active && s.artist.active && !titles.has(s.normalizedTitle));
      if (!candidates.length) throw new AppError(409, 'CATALOG_TOO_SMALL', 'Faltam alternativas distintas no catálogo.');
      const song = weighted(candidates, s => {
        const group = s.artist.categoryId === correct.artist.categoryId ? 8 : 1;
        const era = decade(s) && decade(correct) ? 1 / (1 + Math.abs(decade(s) - decade(correct)) / 10) : 0.5;
        return group * era * (s.artistId === correct.artistId ? 2 : 1) * Math.max(0.2, Math.min(5, s.popularityWeight));
      }, this.rng);
      titles.add(song.normalizedTitle); chosen.push({ title: song.title, isCorrect: false });
    }
    return shuffle(chosen, this.rng);
  }
}
export class ScoringService {
  calculate(input: { correct: boolean; duration: number; responseMs: number; streak: number; difficultyWeight: number }): number {
    if (!input.correct || input.responseMs > 60000) return 0;
    const base: Record<number, number> = { 1: 1000, 3: 850, 5: 700, 10: 500, 15: 300 };
    if (!(input.duration in base)) throw new Error('Invalid server duration');
    const streak = input.streak >= 10 ? 1.3 : input.streak >= 7 ? 1.2 : input.streak >= 5 ? 1.1 : input.streak >= 3 ? 1.05 : 1;
    // At most 20% speed bonus; listening through the clip incurs no speed penalty.
    const thinkingMs = Math.max(0, input.responseMs - input.duration * 1000);
    const speed = 1 + 0.2 * Math.max(0, 1 - thinkingMs / 30000);
    return Math.round(base[input.duration]! * streak * speed * Math.max(0.8, Math.min(1.2, input.difficultyWeight)));
  }
}
