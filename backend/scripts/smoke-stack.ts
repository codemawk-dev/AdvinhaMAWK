import assert from 'node:assert/strict';
const base = process.env.STACK_URL ?? 'http://127.0.0.1:5173';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Este smoke test cria uma partida e só permite ambiente local.');
let cookie = '';
async function request(path: string, body?: unknown) {
  const response = await fetch(`${base}/api${path}`, { method: body ? 'POST' : 'GET',
    headers: { Origin: base, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  const session = response.headers.get('set-cookie');
  if (session) cookie = session.split(';')[0]!;
  assert.ok(response.ok, `${path}: HTTP ${response.status}`);
  return response;
}
assert.equal((await (await request('/health')).json()).status, 'ok');
const catalog = await (await request('/catalog/summary')).json();
assert.ok(catalog.songs >= 5000);
await request('/sessions', { displayName: 'Validação progressiva' });
assert.equal((await (await request('/sessions/me')).json()).displayName, 'Validação progressiva');
const { gameId } = await (await request('/games', { rounds: 10 })).json();
const suggestions = (await (await request('/catalog/search?q=amor')).json()).songs;
assert.ok(suggestions.length >= 5);
for (let index = 0; index < 10; index++) {
  for (let clue = 0; clue < 5; clue++) {
    const round = await (await request(`/games/${gameId}/round`)).json();
    assert.equal(round.attempt, clue);
    assert.equal(round.duration, [0.1, 0.5, 2, 8, 15][clue]);
    assert.equal('options' in round, false);
    if (index === 0) {
      assert.deepEqual(await (await request(`/games/${gameId}/round`)).json(), round);
      const audio = await request(round.previewUrl);
      assert.match(audio.headers.get('content-type') ?? '', /audio\/wav/);
      const clip = Buffer.from(await audio.arrayBuffer());
      assert.equal(clip.readUInt32LE(40) / (44100 * 2), round.duration);
      console.log(JSON.stringify({ audio: 'ok', bytes: clip.length, duration: round.duration }));
    }
    const skip = index === 0 || clue === 0;
    const answer = await (await request(`/games/${gameId}/${skip ? 'skip' : 'answer'}`, {
      roundId: round.roundId, attempt: round.attempt, revision: round.revision, ...(skip ? {} : { songId: suggestions[clue].id }),
    })).json();
    if (answer.roundFinished) { assert.equal(answer.completed, index === 9); break; }
    assert.equal('correctAnswer' in answer, false);
  }
}
const result = await (await request(`/games/${gameId}/result`)).json();
assert.equal(result.status, 'COMPLETED');
assert.equal(result.rounds.length, 10);
const ranking = await (await request('/rankings/all-time')).json();
assert.ok(ranking.entries.some((entry: { displayName: string }) => entry.displayName === 'Validação progressiva'));
console.log(JSON.stringify({ stack: 'ok', catalog, completedRounds: result.rounds.length, score: result.score }));
