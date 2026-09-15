import { randomUUID } from 'node:crypto';
import type { PlayableSong } from '../src/games/engine.js';
export function song(index: number, group = index % 9): PlayableSong {
  const artistId = randomUUID();
  return {
    id: randomUUID(), appleTrackId: String(100000 + index), title: `Canção ${index}`, normalizedTitle: `cancao ${index}`,
    artistId, album: 'Álbum', previewUrl: 'https://audio-ssl.itunes.apple.com/test.m4a', coverUrl: null, appleMusicUrl: null,
    genre: 'Brazilian', releaseDate: new Date(Date.UTC(1970 + (index % 6) * 10, 0, 1)), originalYear: null,
    popularityWeight: 1, difficultyWeight: 1, versionRank: 0, active: true, audioUnavailableUntil: null,
    lastSeenAt: new Date(), lastVerifiedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    artist: { id: artistId, name: `Artista ${index}`, normalizedName: `artista ${index}`, categoryId: `group${group}`,
      aliases: [], appleArtistId: String(200000 + index), active: true, catalogPriority: 1,
      lastSyncedAt: null, nextSyncAt: new Date(), syncError: null, createdAt: new Date(), updatedAt: new Date() },
  };
}
export function seededRandom(seed = 12345) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
