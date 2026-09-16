import 'dotenv/config';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const base = 'http://127.0.0.1:5173/api';
let cookie = '';
async function request(path: string, body?: unknown) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { Origin: 'http://127.0.0.1:5173', Cookie: cookie, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
  cookie = response.headers.get('set-cookie')?.split(';')[0] ?? cookie;
  assert.ok(response.ok, `${path}: ${response.status}`);
  return response.json();
}
try {
  await request('/sessions', { displayName: 'Validação preferências' });
  const preferences = { genres: ['sertanejo', 'pop'], yearFrom: 2018, yearTo: new Date().getFullYear() };
  const { gameId } = await request('/games', { rounds: 10, preferences });
  const rounds = await db.gameRound.findMany({ where: { gameId }, include: { song: { include: { artist: true } } } });
  assert.equal(rounds.length, 10);
  for (const round of rounds) {
    assert.ok(preferences.genres.includes(round.song.artist.categoryId));
    assert.ok(round.releaseYear! >= preferences.yearFrom && round.releaseYear! <= preferences.yearTo);
  }
  let current = await request(`/games/${gameId}/round`);
  for (let attempt = 0; attempt < 4; attempt++) {
    await request(`/games/${gameId}/skip`, { roundId: current.roundId, attempt: current.attempt, revision: current.revision });
    current = await request(`/games/${gameId}/round`);
    assert.equal(current.attempt, attempt + 1);
  }
  const result = await request(`/games/${gameId}/skip`, { roundId: current.roundId, attempt: current.attempt, revision: current.revision });
  assert.ok(result.correctAnswer.year >= 2018);
  console.log(JSON.stringify({ verified: 'preferences-and-manual-clues', rounds: rounds.length, genres: [...new Set(rounds.map(r => r.song.artist.categoryId))], years: [...new Set(rounds.map(r => r.releaseYear))], revealedYear: result.correctAnswer.year }));
} finally { await db.$disconnect(); }
