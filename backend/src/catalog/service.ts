import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { MusicSearchClient } from './itunes-client.js';
import { ArtistRepository, SongRepository } from './repositories.js';
import { AppError } from '../core/errors.js';
import type { Config } from '../core/config.js';
export class CatalogService {
  private readonly owner = randomUUID();
  private running = false;
  constructor(private db: PrismaClient, private artists: ArtistRepository, private songs: SongRepository,
    private apple: MusicSearchClient, private config: Config, private logger: Pick<FastifyBaseLogger, 'info' | 'error'>) {}
  private async acquire(): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(Date.now() + 600000);
    const renewed = await this.db.catalogLease.updateMany({ where: { id: 'catalog', expiresAt: { lte: now } }, data: { owner: this.owner, expiresAt } });
    if (renewed.count) return true;
    try { await this.db.catalogLease.create({ data: { id: 'catalog', owner: this.owner, expiresAt } }); return true; }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false; throw error; }
  }
  private async renew() {
    const renewed = await this.db.catalogLease.updateMany({ where: { id: 'catalog', owner: this.owner, expiresAt: { gt: new Date() } }, data: { expiresAt: new Date(Date.now() + 600000) } });
    if (!renewed.count) throw new AppError(409, 'SYNC_LEASE_LOST', 'A sincronização perdeu o bloqueio.');
  }
  async syncBatch(): Promise<{ busy: boolean; artists: number; imported: number; failed: number }> {
    if (this.running) return { busy: true, artists: 0, imported: 0, failed: 0 };
    this.running = true;
    let locked = false;
    try {
      locked = await this.acquire();
      if (!locked) return { busy: true, artists: 0, imported: 0, failed: 0 };
      const artists = await this.artists.due(this.config.CATALOG_BATCH_SIZE, new Date());
      let imported = 0;
      let failed = 0;
      for (const artist of artists) {
        await this.renew();
        try {
          const tracks = await this.apple.searchArtist(artist.name);
          const identity = await this.artists.resolveIdentity(artist, tracks);
          if (!identity) throw new Error('Identidade Apple ausente ou ambígua; configure appleArtistId/aliases no admin.');
          for (const track of tracks.filter(t => String(t.artistId) === identity)) {
            if (await this.songs.ingest(artist, track)) imported++;
          }
          await this.artists.markSynced(artist.id, this.config.CATALOG_REFRESH_HOURS);
        } catch (error) {
          failed++;
          await this.artists.markFailed(artist.id, error instanceof Error ? error.message : 'Falha de sincronização');
          this.logger.error({ err: error, artistId: artist.id }, 'catalog.artist.failed');
        }
      }
      await this.renew();
      // Search results are incomplete: disappearance from search never deactivates a track.
      // Only a successful ID lookup (or an explicit missing preview) is evidence of unavailability.
      const stale = await this.songs.stale();
      if (stale.length) {
        try {
          const results = await this.apple.lookupTracks(stale.map(song => song.appleTrackId));
          for (const song of stale) {
            const track = results.find(t => String(t.trackId) === song.appleTrackId);
            if (!track || String(track.artistId) !== song.artist.appleArtistId) await this.songs.unavailable([song.id]);
            else await this.songs.ingest(song.artist, track);
          }
        } catch (error) { this.logger.error({ err: error }, 'catalog.revalidation.failed'); }
      }
      const summary = { busy: false, artists: artists.length, imported, failed };
      this.logger.info(summary, 'catalog.batch.completed');
      return summary;
    } finally {
      try { if (locked) await this.db.catalogLease.deleteMany({ where: { id: 'catalog', owner: this.owner } }); }
      finally { this.running = false; }
    }
  }
  async status() {
    const [artists, songs, activeSongs, dueArtists, errors, lease] = await Promise.all([
      this.db.artist.count(), this.db.song.count(), this.db.song.count({ where: { active: true } }),
      this.db.artist.count({ where: { active: true, nextSyncAt: { lte: new Date() } } }),
      this.db.artist.findMany({ where: { syncError: { not: null } }, select: { id: true, name: true, syncError: true }, take: 30 }),
      this.db.catalogLease.findUnique({ where: { id: 'catalog' }, select: { expiresAt: true } }),
    ]);
    return { artists, songs, activeSongs, dueArtists, errors, syncing: !!lease && lease.expiresAt > new Date() };
  }
}
export function startScheduler(service: CatalogService, intervalMs: number, logger: Pick<FastifyBaseLogger, 'error'>) {
  let stopping = false;
  let timer: NodeJS.Timeout | undefined;
  let pending: Promise<void> = Promise.resolve();
  const tick = () => {
    pending = service.syncBatch().then(() => undefined).catch(err => logger.error({ err }, 'catalog.scheduler.failed')).finally(() => {
      if (!stopping) { timer = setTimeout(tick, intervalMs); timer.unref(); }
    });
  };
  tick();
  return async () => { stopping = true; clearTimeout(timer); await pending; };
}
