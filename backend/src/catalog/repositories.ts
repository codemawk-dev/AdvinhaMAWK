import type { Artist, PrismaClient } from '@prisma/client';
import { editorialWeights } from './curation.js';
import { normalizeName, normalizeTitle, versionRank } from './normalization.js';
import { isAppleAudioUrl, type AppleTrack } from './itunes-client.js';

export class ArtistRepository {
  constructor(private db: PrismaClient) {}
  async due(limit: number, now: Date): Promise<Artist[]> {
    const categories = await this.db.internalCategory.findMany({ orderBy: { id: 'asc' } });
    const buckets = await Promise.all(categories.map(category => this.db.artist.findMany({
      where: { active: true, categoryId: category.id, nextSyncAt: { lte: now } },
      orderBy: [{ nextSyncAt: 'asc' }, { catalogPriority: 'desc' }], take: limit,
    })));
    const output: Artist[] = [];
    // Start with the longest-waiting category; repeated small batches cannot starve a group.
    buckets.sort((a, b) => (a[0]?.nextSyncAt.getTime() ?? Infinity) - (b[0]?.nextSyncAt.getTime() ?? Infinity));
    while (output.length < limit && buckets.some(b => b.length)) {
      for (const bucket of buckets) { const artist = bucket.shift(); if (artist && output.length < limit) output.push(artist); }
    }
    return output;
  }
  markSynced(id: string, hours: number) {
    return this.db.artist.update({ where: { id }, data: { lastSyncedAt: new Date(), nextSyncAt: new Date(Date.now() + hours * 3600000), syncError: null } });
  }
  markFailed(id: string, message: string) {
    return this.db.artist.update({ where: { id }, data: { nextSyncAt: new Date(Date.now() + 3600000), syncError: message.slice(0, 300) } });
  }
  async resolveIdentity(artist: Artist, tracks: AppleTrack[]): Promise<string | null> {
    if (artist.appleArtistId) return artist.appleArtistId;
    const names = new Set([artist.normalizedName, ...artist.aliases.map(normalizeName)]);
    const ids = new Set(tracks.filter(t => names.has(normalizeName(t.artistName))).map(t => String(t.artistId)));
    if (ids.size !== 1) return null;
    const id = [...ids][0]!;
    await this.db.artist.update({ where: { id: artist.id }, data: { appleArtistId: id } });
    return id;
  }
}
export class SongRepository {
  constructor(private db: PrismaClient) {}
  playable() {
    return this.db.song.findMany({ where: { active: true, artist: { active: true }, OR: [{ audioUnavailableUntil: null }, { audioUnavailableUntil: { lte: new Date() } }] }, include: { artist: true } });
  }
  async ingest(artist: Artist, track: AppleTrack): Promise<boolean> {
    if (!track.previewUrl || !isAppleAudioUrl(track.previewUrl)) {
      await this.db.song.updateMany({ where: { appleTrackId: String(track.trackId), artistId: artist.id }, data: { active: false, lastVerifiedAt: new Date() } });
      return false;
    }
    const rank = versionRank(track.trackName, track.collectionName);
    if (rank === 99) {
      await this.db.song.updateMany({ where: { appleTrackId: String(track.trackId), artistId: artist.id }, data: { active: false, lastVerifiedAt: new Date() } });
      return false;
    }
    const normalizedTitle = normalizeTitle(track.trackName);
    return this.db.$transaction(async tx => {
      const byTrack = await tx.song.findUnique({ where: { appleTrackId: String(track.trackId) } });
      const canonical = await tx.song.findUnique({ where: { artistId_normalizedTitle: { artistId: artist.id, normalizedTitle } } });
      if (byTrack && byTrack.artistId !== artist.id) return false;
      if (byTrack && canonical && byTrack.id !== canonical.id) return false;
      const existing = canonical ?? byTrack;
      if (existing && existing.active && existing.versionRank < rank) return false;
      // Stable tie-break avoids changing the canonical recording on every search.
      if (existing && existing.active && existing.versionRank === rank && existing.appleTrackId !== String(track.trackId)) return false;
      const data = {
        appleTrackId: String(track.trackId), title: track.trackName, normalizedTitle, artistId: artist.id,
        album: track.collectionName ?? null, previewUrl: track.previewUrl!, coverUrl: track.artworkUrl100 ?? null,
        appleMusicUrl: track.trackViewUrl ?? null, genre: track.primaryGenreName ?? null,
        releaseDate: track.releaseDate ? new Date(track.releaseDate) : null,
        ...(existing && existing.previewUrl !== track.previewUrl ? { audioUnavailableUntil: null } : {}),
        versionRank: rank, active: true, lastSeenAt: new Date(), lastVerifiedAt: new Date(),
      };
      if (existing) await tx.song.update({ where: { id: existing.id }, data });
      else await tx.song.create({ data: { ...data, ...editorialWeights(artist.name, track.trackName) } });
      return true;
    });
  }
  stale(limit = 50) {
    return this.db.song.findMany({ where: { lastVerifiedAt: { lt: new Date(Date.now() - 30 * 86400000) }, artist: { active: true } }, orderBy: { lastVerifiedAt: 'asc' }, take: limit, include: { artist: true } });
  }
  unavailable(ids: string[]) {
    return this.db.song.updateMany({ where: { id: { in: ids } }, data: { active: false, lastVerifiedAt: new Date() } });
  }
}
