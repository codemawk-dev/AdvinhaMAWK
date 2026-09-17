import { buildApp } from '../src/app.js';
import { readConfig } from '../src/core/config.js';
import { seedArtists } from '../src/catalog/seed.js';
import { testDatabase } from '../tests/database.js';
import type { RoundResponse } from '../src/games/service.js';
const database = await testDatabase();
const config = readConfig({ ...process.env, DATABASE_URL: database.url, SUPABASE_DATABASE_URL: '', SCHEDULER_ENABLED: 'false' });
const { app, catalog } = await buildApp(config, { db: database.db, logger: false });
try {
  const count = await seedArtists(database.db);
  console.log(JSON.stringify({ seededArtists: count }));
  console.log(JSON.stringify(await catalog.syncBatch()));
  const songs = await database.db.song.count({ where: { active: true } });
  const categories = await database.db.song.findMany({ where: { active: true }, select: { artist: { select: { categoryId: true } } } });
  console.log(JSON.stringify({ activeSongs: songs, categories: [...new Set(categories.map(s => s.artist.categoryId))] }));
  const created = await app.inject({ method: 'POST', url: '/games' });
  if (created.statusCode !== 201) throw new Error(created.body);
  const game = created.json<{ gameId: string; accessToken: string }>();
  const headers = { authorization: `Bearer ${game.accessToken}` };
  for (let i = 0; i < 10; i++) {
    const response = await app.inject({ url: `/games/${game.gameId}/round`, headers });
    if (response.statusCode !== 200) throw new Error(response.body);
    const round = response.json<RoundResponse>();
    if (i === 0) {
      const audio = await app.inject({ url: round.previewUrl, headers });
      console.log(JSON.stringify({ audioStatus: audio.statusCode, audioBytes: audio.rawPayload.length, duration: round.duration }));
      if (audio.statusCode !== 200) throw new Error(audio.body);
    }
    const target = await database.db.gameRound.findUniqueOrThrow({ where: { id: round.roundId } });
    const answer = await app.inject({ method: 'POST', url: `/games/${game.gameId}/answer`, headers, payload: { roundId: round.roundId, songId: target.songId, attempt: round.attempt, revision: round.revision } });
    if (answer.statusCode !== 200) throw new Error(answer.body);
  }
  const result = await app.inject({ url: `/games/${game.gameId}/result`, headers });
  if (result.statusCode !== 200) throw new Error(result.body);
  console.log(JSON.stringify({ result: result.json() }));
} finally { await app.close(); await database.stop(); }
