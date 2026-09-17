import { z } from 'zod';
import type { PlayableSong } from './engine.js';
export const preferencesSchema = z.object({
  genres: z.array(z.enum(['sertanejo', 'pagode_samba', 'funk', 'trap_rap', 'pop', 'axe', 'forro', 'mpb', 'rock', 'paredao_baiano'])).max(10).default([]),
  yearFrom: z.number().int().min(1900).max(new Date().getUTCFullYear()).nullable().default(null),
  yearTo: z.number().int().min(1900).max(new Date().getUTCFullYear()).nullable().default(null),
}).strict().refine(value => value.yearFrom === null || value.yearTo === null || value.yearFrom <= value.yearTo, 'O ano inicial deve ser anterior ao final.');
export type MusicPreferences = z.infer<typeof preferencesSchema>;
export function filterSongs(pool: PlayableSong[], preferences: MusicPreferences) {
  return pool.filter(song => {
    const year = song.originalYear ?? song.releaseDate?.getUTCFullYear();
    return (!preferences.genres.length || preferences.genres.includes(song.artist.categoryId as MusicPreferences['genres'][number])) &&
      (preferences.yearFrom === null || (year !== undefined && year >= preferences.yearFrom)) &&
      (preferences.yearTo === null || (year !== undefined && year <= preferences.yearTo));
  });
}
