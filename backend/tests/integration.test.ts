import { transferCatalog } from '../src/catalog/transfer.js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { readConfig } from '../src/core/config.js';
import { ArtistRepository, SongRepository } from '../src/catalog/repositories.js';
import { CatalogService } from '../src/catalog/service.js';
import { testDatabase } from './database.js';
import { song } from './fixtures.js';
import type { AnswerResponse, RoundResponse } from '../src/games/service.js';
import type { AppleTrack } from '../src/catalog/itunes-client.js';

describe('API + migrations + PostgreSQL real', () => {
  let database: Awaited<ReturnType<typeof testDatabase>>;
  let application: Awaited<ReturnType<typeof buildApp>>;
  let token: string;
  const config = readConfig({ DATABASE_URL: 'postgresql://unused', JWT_SECRET: 'test-secret-with-more-than-32-characters', ADMIN_API_KEY: 'test-admin-key-long-enough', NODE_ENV: 'test', SCHEDULER_ENABLED: 'false' });
  beforeAll(async () => {
    database = await testDatabase();
    for (let group = 0; group < 9; group++) await database.db.internalCategory.create({ data: { id: `group${group}`, name: `Grupo ${group}` } });
    for (let i = 0; i < 45; i++) {
      const { artist, ...data } = song(i);
      await database.db.artist.create({ data: artist }); await database.db.song.create({ data });
    }
    application = await buildApp(config, { db: database.db, logger: false,
      audio: { clip: async () => Buffer.from('test audio') },
      apple: { searchArtist: async () => [], lookupTracks: async () => [] },
    });
    const session = await application.app.inject({ method: 'POST', url: '/sessions', payload: { displayName: 'Teste' } });
    token = session.json<{ accessToken: string }>().accessToken;
  }, 60000);
  afterAll(async () => { await application?.app.close(); await database?.stop(); });
  const headers = () => ({ authorization: `Bearer ${token}` });
  let createAddress = 1;
  async function create(rounds = 10) {
    const response = await application.app.inject({ method: 'POST', url: '/games', remoteAddress: '127.0.1.' + createAddress++, headers: headers(), payload: { rounds } });
    expect(response.statusCode, response.body).toBe(201); return response.json<{ gameId: string }>().gameId;
  }
  async function round(id: string) {
    const response = await application.app.inject({ url: `/games/${id}/round`, headers: headers() });
    expect(response.statusCode, response.body).toBe(200); return response.json<RoundResponse>();
  }
  async function answer(id: string, current: RoundResponse) {
    const correct = await database.db.roundOption.findFirstOrThrow({ where: { roundId: current.roundId, isCorrect: true } });
    return application.app.inject({ method: 'POST', url: `/games/${id}/answer`, headers: headers(), payload: { roundId: current.roundId, answerId: correct.id } });
  }
  it('health verifica o banco', async () => expect((await application.app.inject('/health')).json()).toEqual({ status: 'ok', database: 'up' }));
  it('recupera perfil autenticado e expõe apenas contagens do catálogo', async () => {
    expect((await application.app.inject('/sessions/me')).statusCode).toBe(401);
    const profile = await application.app.inject({ url: '/sessions/me', headers: headers() });
    expect(profile.json()).toEqual({ userId: expect.any(String), displayName: 'Teste' });
    expect((await application.app.inject('/catalog/summary')).json()).toEqual({ songs: 45, artists: 45, groups: 9 });
  });
  it('pula sem alternativa, zera pontos e impede avanço duplicado', async () => {
    const id = await create(1); const current = await round(id);
    const skip = () => application.app.inject({ method: 'POST', url: `/games/${id}/skip`, headers: headers(), payload: { roundId: current.roundId } });
    const responses = await Promise.all([skip(), skip()]);
    expect(responses.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect(responses.find(r => r.statusCode === 200)!.json()).toMatchObject({ correct: false, points: 0, completed: true });
    expect(await database.db.playerAnswer.findUnique({ where: { roundId: current.roundId } })).toMatchObject({ optionId: null });
    const result = (await application.app.inject({ url: `/games/${id}/result`, headers: headers() })).json();
    expect(result).toMatchObject({ correctAnswers: 0, rounds: [{ position: 0, answer: { correct: false, points: 0 } }] });
    expect(JSON.stringify(result)).not.toMatch(/audioUrl|isCorrect|appleTrackId|optionId/);
  });
  it('recusa categorias, dificuldade e campos extras no POST /games', async () => {
    for (const payload of [{ category: 'sertanejo' }, { difficulty: 'easy' }, { rounds: 10, score: 999 }]) {
      expect((await application.app.inject({ method: 'POST', url: '/games', headers: headers(), payload })).statusCode).toBe(400);
    }
  });
  it('inicia sessão implícita com cookie e joga sem configuração musical', async () => {
    const response = await application.app.inject({ method: 'POST', url: '/games' });
    expect(response.statusCode).toBe(201); expect(response.cookies[0]!.httpOnly).toBe(true);
    const gameId = response.json<{ gameId: string }>().gameId;
    expect((await application.app.inject({ url: `/games/${gameId}/round`, cookies: { session: response.cookies[0]!.value } })).statusCode).toBe(200);
  });
  it('não revela IDs de músicas, artista, fonte, resposta ou rodadas futuras', async () => {
    const id = await create(); const current = await round(id);
    expect(Object.keys(current).sort()).toEqual(['deadline', 'duration', 'options', 'previewUrl', 'roundId']);
    for (const option of current.options) expect(Object.keys(option).sort()).toEqual(['id', 'title']);
    expect(current.previewUrl).toBe(`/games/${id}/rounds/${current.roundId}/audio`);
    const summary = await application.app.inject({ url: `/games/${id}`, headers: headers() });
    expect(summary.body).not.toMatch(/songId|options|audioUrl|isCorrect|appleTrackId/);
    const again = await round(id); expect(again).toEqual(current);
    const future = await database.db.gameRound.findUniqueOrThrow({ where: { gameId_position: { gameId: id, position: 1 } } });
    expect((await application.app.inject({ url: `/games/${id}/rounds/${future.id}/audio`, headers: headers() })).statusCode).toBe(404);
    expect((await application.app.inject({ url: `/games/${id}/result`, headers: headers() })).statusCode).toBe(409);
  });
  it('bloqueia jogadores alheios e sessão inválida', async () => {
    const id = await create();
    const other = await application.app.inject({ method: 'POST', url: '/sessions' });
    const otherToken = other.json<{ accessToken: string }>().accessToken;
    expect((await application.app.inject({ url: `/games/${id}/round`, headers: { authorization: `Bearer ${otherToken}` } })).statusCode).toBe(404);
    expect((await application.app.inject({ url: `/games/${id}/round`, headers: { authorization: 'Bearer invalid' } })).statusCode).toBe(401);
    expect((await application.app.inject({ url: `/games/${id}/round` })).statusCode).toBe(401);
  });
  it('não aceita respostas antes do início, futuras ou com alternativa estrangeira', async () => {
    const id = await create();
    const rows = await database.db.gameRound.findMany({ where: { gameId: id }, orderBy: { position: 'asc' }, include: { options: true } });
    const submit = (index: number, answerId: string) => application.app.inject({ method: 'POST', url: `/games/${id}/answer`, headers: headers(), payload: { roundId: rows[index]!.id, answerId } });
    expect((await submit(0, rows[0]!.options[0]!.id)).statusCode).toBe(409);
    await round(id);
    expect((await submit(1, rows[1]!.options[0]!.id)).statusCode).toBe(409);
    expect((await submit(0, rows[1]!.options[0]!.id)).statusCode).toBe(400);
  });
  it('serializa respostas concorrentes e aplica score uma única vez', async () => {
    const id = await create(); const current = await round(id);
    const results = await Promise.all([answer(id, current), answer(id, current)]);
    expect(results.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect(await database.db.playerAnswer.count({ where: { roundId: current.roundId } })).toBe(1);
    const successful = results.find(r => r.statusCode === 200)!.json<AnswerResponse>();
    const game = await database.db.game.findUniqueOrThrow({ where: { id } });
    expect(game.score).toBe(successful.points); expect(game.currentRound).toBe(1);
  });
  it('limita áudio à rodada atual e rejeita manipulação de duração e pontuação', async () => {
    const id = await create(); const current = await round(id);
    const response = await application.app.inject({ url: current.previewUrl, headers: headers() });
    expect(response.statusCode).toBe(200); expect(response.headers['cache-control']).toContain('no-store');
    const manipulated = await application.app.inject({ method: 'POST', url: `/games/${id}/answer`, headers: headers(), payload: { roundId: current.roundId, answerId: current.options[0]!.id, duration: 1, score: 100000 } });
    expect(manipulated.statusCode).toBe(400);
    await answer(id, current);
    expect((await application.app.inject({ url: current.previewUrl, headers: headers() })).statusCode).toBe(404);
  });
  it('zera pontos fora do prazo e permite avançar', async () => {
    const id = await create(); const current = await round(id);
    await database.db.gameRound.update({ where: { id: current.roundId }, data: { startedAt: new Date(Date.now() - 61000) } });
    const response = await answer(id, current); expect(response.statusCode).toBe(200);
    expect(response.json<AnswerResponse>()).toMatchObject({ correct: false, points: 0, streak: 0 });
  });
  it('executa partida completa, libera resultado e alimenta rankings', async () => {
    const id = await create();
    for (let i = 0; i < 10; i++) {
      const response = await answer(id, await round(id)); expect(response.statusCode).toBe(200);
      expect(response.json<AnswerResponse>().correctAnswer.title).toBeTruthy();
    }
    const result = await application.app.inject({ url: `/games/${id}/result`, headers: headers() });
    expect(result.json()).toMatchObject({ status: 'COMPLETED', currentRound: 10, streak: 10, correctAnswers: 10 });
    expect(result.json<{ rounds: unknown[] }>().rounds).toHaveLength(10);
    expect((await application.app.inject({ url: `/games/${id}/round`, headers: headers() })).statusCode).toBe(409);
    for (const path of ['/rankings', '/rankings/daily', '/rankings/weekly', '/rankings/all-time']) {
      const response = await application.app.inject(path);
      expect(response.json<{ entries: unknown[] }>().entries).toHaveLength(1);
    }
  });
  it('protege admin e aceita cadastro configurável', async () => {
    expect((await application.app.inject('/admin/artists')).statusCode).toBe(401);
    const response = await application.app.inject({ method: 'POST', url: '/admin/artists', headers: { 'x-admin-key': config.ADMIN_API_KEY }, payload: { name: 'Novo Artista', categoryId: 'group0' } });
    expect(response.statusCode).toBe(201);
    expect((await application.app.inject({ url: '/admin/catalog/status', headers: { 'x-admin-key': config.ADMIN_API_KEY } })).statusCode).toBe(200);
  });
  it('deduplica por trackId e título, prefere estúdio e preserva pesos editoriais', async () => {
    const repository = new SongRepository(database.db);
    const artist = await database.db.artist.create({ data: { name: 'Cantor teste', normalizedName: 'cantor teste', categoryId: 'group0', appleArtistId: '999999' } });
    const base: AppleTrack = { kind: 'song', artistId: 999999, artistName: artist.name, trackId: 999001, trackName: 'Obra (Ao Vivo)', previewUrl: 'https://audio-ssl.itunes.apple.com/test.m4a' };
    await repository.ingest(artist, base);
    await repository.ingest(artist, { ...base, trackId: 999002, trackName: 'Obra' });
    const stored = await database.db.song.findFirstOrThrow({ where: { artistId: artist.id } });
    expect(stored.appleTrackId).toBe('999002');
    await database.db.song.update({ where: { id: stored.id }, data: { popularityWeight: 3, originalYear: 1980 } });
    await repository.ingest(artist, { ...base, trackId: 999002, trackName: 'Obra' });
    await repository.ingest(artist, { ...base, trackId: 999003, trackName: 'Obra (Remix)' });
    expect(await database.db.song.count({ where: { artistId: artist.id } })).toBe(1);
    expect(await database.db.song.findUnique({ where: { id: stored.id } })).toMatchObject({ popularityWeight: 3, originalYear: 1980 });
    await repository.ingest(artist, { ...base, trackId: 999002, trackName: 'Obra', previewUrl: undefined });
    expect((await database.db.song.findUniqueOrThrow({ where: { id: stored.id } })).active).toBe(false);
  });
  it('não aceita roundId de outra partida e mantém início único em GET concorrente', async () => {
    const first = await create(); const second = await create();
    const rounds = await Promise.all([round(first), round(first)]);
    expect(rounds[0]).toEqual(rounds[1]);
    const foreign = await round(second);
    const response = await application.app.inject({ method: 'POST', url: `/games/${first}/answer`, headers: headers(), payload: { roundId: foreign.roundId, answerId: foreign.options[0]!.id } });
    expect(response.statusCode).toBe(409);
  });
  it('não altera disponibilidade, prioridade ou aliases em PATCH parcial', async () => {
    const artist = await database.db.artist.create({ data: { name: 'Editor', normalizedName: 'editor', categoryId: 'group1', aliases: ['Apelido'], active: false, catalogPriority: 7 } });
    const response = await application.app.inject({ method: 'PATCH', url: `/admin/artists/${artist.id}`, headers: { 'x-admin-key': config.ADMIN_API_KEY }, payload: { name: 'Editor revisado' } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ active: false, catalogPriority: 7, aliases: ['Apelido'] });
  });
  it('busca parcial ou indisponível não desativa catálogo existente', async () => {
    await database.db.artist.updateMany({ data: { nextSyncAt: new Date(Date.now() + 86400000) } });
    const artist = await database.db.artist.findFirstOrThrow({ where: { appleArtistId: { not: null }, active: true } });
    await database.db.artist.update({ where: { id: artist.id }, data: { nextSyncAt: new Date(0) } });
    const existing = await database.db.song.count({ where: { artistId: artist.id, active: true } });
    const apple = { searchArtist: vi.fn(async () => []), lookupTracks: vi.fn(async () => []) };
    const service = new CatalogService(database.db, new ArtistRepository(database.db), new SongRepository(database.db), apple, config, application.app.log);
    expect(await service.syncBatch()).toMatchObject({ busy: false, artists: 1, failed: 0 });
    expect(await database.db.song.count({ where: { artistId: artist.id, active: true } })).toBe(existing);
    await database.db.artist.update({ where: { id: artist.id }, data: { nextSyncAt: new Date(0) } });
    apple.searchArtist.mockRejectedValueOnce(new Error('Network unavailable'));
    expect(await service.syncBatch()).toMatchObject({ artists: 1, failed: 1 });
    expect(await database.db.song.count({ where: { artistId: artist.id, active: true } })).toBe(existing);
  });
  it('bloqueia origens externas e limita criação de sessões', async () => {
    const blocked = await application.app.inject({ method: 'POST', url: '/sessions', headers: { origin: 'https://evil.test' } });
    expect(blocked.statusCode).toBe(403);
    for (let i = 0; i < 10; i++) expect((await application.app.inject({ method: 'POST', url: '/sessions', remoteAddress: '127.0.5.1' })).statusCode).toBe(201);
    expect((await application.app.inject({ method: 'POST', url: '/sessions', remoteAddress: '127.0.5.1' })).statusCode).toBe(429);
  });
  it('ativa RLS nas tabelas que poderiam expor respostas', async () => {
    const tables = await database.db.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN ('Game', 'GameRound', 'RoundOption', 'PlayerAnswer', 'Song', 'Artist')`;
    expect(tables).toHaveLength(6);
    expect(tables.every(table => table.relrowsecurity)).toBe(true);
  });
  it('transfere catálogo sem copiar jogadores ou partidas, com repetição idempotente', async () => {
    const destination = await testDatabase();
    try {
      const sourceSongs = await database.db.song.count();
      expect(await transferCatalog(database.db, destination.db)).toMatchObject({ inserted: sourceSongs });
      expect(await destination.db.artist.count()).toBe(await database.db.artist.count());
      expect(await destination.db.song.count()).toBe(sourceSongs);
      expect(await destination.db.user.count()).toBe(0);
      expect(await destination.db.game.count()).toBe(0);
      expect(await transferCatalog(database.db, destination.db)).toEqual({ inserted: 0 });
    } finally { await destination.stop(); }
  }, 60000);
  it('rejeita identidades ambíguas e respeita bloqueio de sincronização', async () => {
    const artists = new ArtistRepository(database.db);
    const artist = await database.db.artist.create({ data: { name: 'Homônimo', normalizedName: 'homonimo', categoryId: 'group0' } });
    const track: AppleTrack = { kind: 'song', artistId: 123, artistName: 'Homônimo', trackId: 123001, trackName: 'Obra' };
    expect(await artists.resolveIdentity(artist, [track, { ...track, artistId: 456 }])).toBeNull();
    const apple = { searchArtist: vi.fn(async () => []), lookupTracks: vi.fn(async () => []) };
    const service = new CatalogService(database.db, artists, new SongRepository(database.db), apple, config, application.app.log);
    await database.db.catalogLease.create({ data: { id: 'catalog', owner: randomUUID(), expiresAt: new Date(Date.now() + 60000) } });
    expect((await service.syncBatch()).busy).toBe(true); expect(apple.searchArtist).not.toHaveBeenCalled();
    await database.db.catalogLease.delete({ where: { id: 'catalog' } });
  });
});


// Additional isolation checks intentionally use distinct source addresses so one test's
// request budget cannot mask another test's authorization assertions.
