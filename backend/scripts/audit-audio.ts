import { PrismaClient } from '@prisma/client';
import { readConfig } from '../src/core/config.js';
import { ApplePreviewProvider, AudioSourceError } from '../src/audio/provider.js';
const config = readConfig();
const db = new PrismaClient({ datasourceUrl: config.DATABASE_URL });
const provider = new ApplePreviewProvider(config.FFMPEG_PATH);
try {
  const artists = await db.artist.findMany({ where: { active: true, songs: { some: { active: true } } },
    orderBy: { name: 'asc' }, select: { songs: { where: { active: true }, orderBy: { popularityWeight: 'desc' }, take: 1 } } });
  let available = 0; let unavailable = 0; let temporary = 0;
  const flagged = await db.song.findMany({ where: { audioUnavailableUntil: { not: null } } });
  const songs = [...new Map([...flagged, ...artists.flatMap(artist => artist.songs)].map(song => [song.id, song])).values()];
  for (const song of songs) {
    try {
      await provider.clip(song.previewUrl, 15); available++;
      await db.song.updateMany({ where: { id: song.id, previewUrl: song.previewUrl }, data: { audioUnavailableUntil: null, lastVerifiedAt: new Date() } });
    }
    catch (error) {
      if (error instanceof AudioSourceError && error.permanent) {
        unavailable++;
        await db.song.updateMany({ where: { id: song.id, previewUrl: song.previewUrl }, data: { audioUnavailableUntil: new Date(Date.now() + 24 * 3600000) } });
      } else temporary++;
    }
    console.log(JSON.stringify({ checked: available + unavailable + temporary, total: songs.length, available, unavailable, temporary }));
  }
} finally { await db.$disconnect(); }
