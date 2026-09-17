import { z } from 'zod';
import { setTimeout as sleep } from 'node:timers/promises';
import { AppError } from '../core/errors.js';
const trackSchema = z.object({
  kind: z.literal('song'), trackId: z.number().int().positive(), artistId: z.number().int().positive(),
  trackName: z.string().min(1), artistName: z.string().min(1),
  collectionName: z.string().optional(), previewUrl: z.preprocess(value => value === '' || value === null ? undefined : value, z.string().url().optional()),
  artworkUrl100: z.string().url().optional(), trackViewUrl: z.string().url().optional(),
  primaryGenreName: z.string().optional(), releaseDate: z.string().datetime().optional(),
});
export type AppleTrack = z.infer<typeof trackSchema>;
export interface MusicSearchClient {
  searchArtist(name: string): Promise<AppleTrack[]>;
  lookupTracks(ids: string[]): Promise<AppleTrack[]>;
  lookupArtistSongs?(ids: string[], recent: boolean): Promise<AppleTrack[]>;
}
export function isAppleAudioUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') &&
      (url.hostname.endsWith('.mzstatic.com') || url.hostname === 'audio-ssl.itunes.apple.com');
  } catch { return false; }
}
export class ITunesClient implements MusicSearchClient {
  private nextRequestAt = 0;
  private queue: Promise<void> = Promise.resolve();
  private active = 0;
  private waiting: (() => void)[] = [];
  constructor(private delayMs = 4000, private fetcher: typeof fetch = fetch) {}
  searchArtist(name: string): Promise<AppleTrack[]> {
    return this.request('/search', { term: name, attribute: 'artistTerm', limit: '200' });
  }
  lookupTracks(ids: string[]): Promise<AppleTrack[]> {
    if (!ids.length || ids.length > 50 || ids.some(id => !/^\d+$/.test(id))) throw new Error('Invalid lookup batch');
    return this.request('/lookup', { id: ids.join(',') });
  }
  lookupArtistSongs(ids: string[], recent: boolean): Promise<AppleTrack[]> {
    if (!ids.length || ids.length > 10 || ids.some(id => !/^\d+$/.test(id))) throw new Error('Invalid artist lookup batch');
    return this.request('/lookup', { id: ids.join(','), limit: '200', ...(recent ? { sort: 'recent' } : {}) });
  }
  private async request(path: string, params: Record<string, string>): Promise<AppleTrack[]> {
    if (this.active >= 4) await new Promise<void>(resolve => this.waiting.push(resolve));
    else this.active++;
    try { return await this.perform(path, params); }
    finally { const next = this.waiting.shift(); if (next) next(); else this.active--; }
  }
  private slot(): Promise<void> {
    const result = this.queue.then(async () => {
      while (this.nextRequestAt > Date.now()) await sleep(this.nextRequestAt - Date.now());
      this.nextRequestAt = Date.now() + this.delayMs;
    });
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async perform(path: string, params: Record<string, string>): Promise<AppleTrack[]> {
    const url = new URL(path, 'https://itunes.apple.com');
    url.search = new URLSearchParams({ country: 'BR', media: 'music', entity: 'song', ...params }).toString();
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.slot();
      try {
        const response = await this.fetcher(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
        if (response.status === 429 || response.status >= 500) {
          const retry = response.headers.get('retry-after');
          const retryMs = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now()) : 0;
          this.nextRequestAt = Math.max(this.nextRequestAt, Date.now() + Math.max(this.delayMs * 2 ** attempt, Math.min(60000, retryMs || 0)));
          await response.body?.cancel();
          continue;
        }
        if (!response.ok) throw new AppError(502, 'APPLE_ERROR', `Apple retornou HTTP ${response.status}`);
        const body = z.object({ resultCount: z.number().int().nonnegative(), results: z.array(z.unknown()) }).parse(await response.json());
        if (body.resultCount !== body.results.length) throw new AppError(502, 'APPLE_INVALID_RESPONSE', 'Resposta incompleta da Apple.');
        // Malformed song entries invalidate the batch: never infer unavailability from a broken payload.
        return body.results.filter(item => typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'song')
          .map(item => trackSchema.parse(item));
      } catch (error) {
        if (error instanceof AppError || error instanceof z.ZodError || attempt === 2) throw error;
        this.nextRequestAt = Math.max(this.nextRequestAt, Date.now() + this.delayMs * 2 ** attempt);
      }
    }
    throw new AppError(502, 'APPLE_UNAVAILABLE', 'Apple temporariamente indisponível.');
  }
}
