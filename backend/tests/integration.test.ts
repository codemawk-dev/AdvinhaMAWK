import { transferCatalog } from '../src/catalog/transfer.js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { readConfig } from '../src/core/config.js';
import { ArtistRepository, SongRepository } from '../src/catalog/repositories.js';
import { CatalogService } from '../src/catalog/service.js';
import { AudioSourceError } from '../src/audio/provider.js';
import { testDatabase } from './database.js';
import { song } from './fixtures.js';
import type { AnswerResponse, RoundResponse } from '../src/games/service.js';
import type { AppleTrack } from '../src/catalog/itunes-client.js';

describe('API progressiva + migrations + PostgreSQL real', () => {
  let database: Awaited<ReturnType<typeof testDatabase>>;
  let application: Awaited<ReturnType<typeof buildApp>>;
  let token: string;
  const config = readConfig({ DATABASE_URL: 'postgresql://unused', JWT_SECRET: 'test-secret-with-more-than-32-characters', ADMIN_API_KEY: 'test-admin-key-long-enough', NODE_ENV: 'test', SCHEDULER_ENABLED: 'false' });
  const audio = { clip: vi.fn(async (source: string) => {
    if (source.endsWith('/unavailable')) throw new AudioSourceError(true);
    if (source.endsWith('/outage')) throw new AudioSourceError(false);
    return Buffer.from('test wave audio');
  }) };
  beforeAll(async () => {
    database = await testDatabase();
    for (let group = 0; group < 9; group++) await database.db.internalCategory.create({ data: { id: `group${group}`, name: `Grupo ${group}` } });
    for (let i = 0; i < 45; i++) {
      const { artist, ...data } = song(i);
      await database.db.artist.create({ data: artist }); await database.db.song.create({ data });
    }
    application = await buildApp(config, { db: database.db, logger: false, audio,
      apple: { searchArtist: async () => [], lookupTracks: async () => [] } });
    token = (await application.app.inject({ method: 'POST', url: '/sessions', payload: { displayName: 'Teste' } })).json<{ accessToken: string }>().accessToken;
  }, 60000);
  afterAll(async () => { await application?.app.close(); await database?.stop(); });
  const headers = () => ({ authorization: `Bearer ${token}` });
  let address = 1;
  async function create(rounds = 10) {
    const response = await application.app.inject({ method: 'POST', url: '/games', remoteAddress: '127.0.1.' + address++, headers: headers(), payload: { rounds } });
    expect(response.statusCode, response.body).toBe(201); return response.json<{ gameId: string }>().gameId;
  }
  async function round(id: string) {
    const response = await application.app.inject({ url: `/games/${id}/round`, headers: headers() });
    expect(response.statusCode, response.body).toBe(200); return response.json<RoundResponse>();
  }
  async function answer(id: string, current: RoundResponse, guess?: string | null) {
    const target = await database.db.gameRound.findUniqueOrThrow({ where: { id: current.roundId } });
    const songId = guess === undefined ? target.songId : guess;
    return application.app.inject({ method: 'POST', url: `/games/${id}/${songId === null ? 'skip' : 'answer'}`, headers: headers(),
      payload: { roundId: current.roundId, attempt: current.attempt, revision: current.revision, ...(songId === null ? {} : { songId }) } });
  }
  it('verifica health, perfil e contagens sem expor catálogo bruto', async () => {
    expect((await application.app.inject('/health')).json()).toEqual({ status: 'ok', database: 'up' });
    expect((await application.app.inject('/sessions/me')).statusCode).toBe(401);
    expect((await application.app.inject({ url: '/sessions/me', headers: headers() })).json()).toMatchObject({ displayName: 'Teste' });
    expect((await application.app.inject('/catalog/summary')).json()).toEqual({ songs: 45, artists: 45, groups: 9 });
  });
  it('conta músicas compatíveis sem expor títulos ou respostas', async () => {
    const response = await application.app.inject({ method: 'POST', url: '/catalog/matching', payload: { yearFrom: 2020, yearTo: 2020 } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ songs: 7, titles: 7, artists: 7 });
    expect((await application.app.inject({ method: 'POST', url: '/catalog/matching', payload: { yearFrom: 2025, yearTo: 2000 } })).statusCode).toBe(400);
  });
  it('busca títulos e artistas sem acento, limitada e sem resposta/URL', async () => {
    for (const q of ['Canção 44', 'cancao 44', 'artista 44']) {
      const response = await application.app.inject('/catalog/search?q=' + encodeURIComponent(q));
      const rows = response.json<{ songs: { id: string; title: string; artist: string }[] }>().songs;
      expect(rows.some(s => s.title === 'Canção 44')).toBe(true);
      expect(rows.length).toBeLessThanOrEqual(15);
      expect(Object.keys(rows[0]!).sort()).toEqual(['artist', 'id', 'title']);
      expect(response.body).not.toMatch(/previewUrl|isCorrect|appleTrackId/);
    }
    expect((await application.app.inject('/catalog/search?q=a')).statusCode).toBe(400);
  });
  it('não aceita categorias ou pontuação fornecida pelo cliente', async () => {
    for (const payload of [{ category: 'rock' }, { difficulty: 'easy' }, { rounds: 10, score: 999 }])
      expect((await application.app.inject({ method: 'POST', url: '/games', headers: headers(), payload })).statusCode).toBe(400);
  });
  it('persiste o período e mantém o filtro ao substituir áudio indisponível', async () => {
    const response = await application.app.inject({ method: 'POST', url: '/games', remoteAddress: '127.0.9.1', headers: headers(), payload: { rounds: 1, preferences: { yearFrom: 2020, yearTo: 2020 } } });
    expect(response.statusCode, response.body).toBe(201);
    const id = response.json<{ gameId: string }>().gameId;
    const stored = await database.db.game.findUniqueOrThrow({ where: { id } });
    expect(stored.preferences).toMatchObject({ yearFrom: 2020 });
    const original = await database.db.gameRound.findFirstOrThrow({ where: { gameId: id } });
    expect(original.releaseYear).toBe(2020);
    await database.db.gameRound.update({ where: { id: original.id }, data: { audioUrl: 'https://audio-ssl.itunes.apple.com/unavailable' } });
    const current = await round(id);
    expect(current.replaced).toBe(true);
    const replacement = await database.db.gameRound.findUniqueOrThrow({ where: { id: current.roundId } });
    expect(replacement.releaseYear).toBe(2020);
    expect((await answer(id, current)).json()).toMatchObject({ correctAnswer: { year: 2020 } });
  });
  it('prepara antes da rodada, começa em 0.1s e não revela alternativas nem resposta', async () => {
    const id = await create(); const current = await round(id);
    expect(current).toMatchObject({ duration: 0.1, attempt: 0, revision: 0, clues: [0.1, 0.5, 2, 8, 15], guesses: [] });
    expect(current).not.toHaveProperty('options'); expect(current).not.toHaveProperty('deadline');
    expect(JSON.stringify(current)).not.toMatch(/songId|artistName|audioUrl|correctAnswer/);
    expect(await round(id)).toEqual(current);
    expect(audio.clip).toHaveBeenCalled();
    expect((await application.app.inject({ url: `/games/${id}/result`, headers: headers() })).statusCode).toBe(409);
    const future = await database.db.gameRound.findFirstOrThrow({ where: { gameId: id, position: 1 } });
    expect((await application.app.inject({ url: `/games/${id}/rounds/${future.id}/audio?attempt=0&revision=0`, headers: headers() })).statusCode).toBe(409);
  });
  it('avança pistas na mesma música após erro e preserva histórico ao recarregar', async () => {
    const id = await create(1); const first = await round(id);
    const target = await database.db.gameRound.findUniqueOrThrow({ where: { id: first.roundId } });
    const wrong = await database.db.song.findFirstOrThrow({ where: { id: { not: target.songId } } });
    const response = await answer(id, first, wrong.id);
    expect(response.json()).toMatchObject({ correct: false, roundFinished: false, points: 0 });
    expect(response.json()).not.toHaveProperty('correctAnswer');
    const next = await round(id);
    expect(next).toMatchObject({ roundId: first.roundId, duration: 0.5, attempt: 1, guesses: [{ title: wrong.title }] });
    expect((await answer(id, next, wrong.id)).statusCode).toBe(400);
    expect((await answer(id, next)).json()).toMatchObject({ correct: true, roundFinished: true, points: 1000 });
  });
  it('pula cinco pistas e revela somente na última, sem pontos', async () => {
    const id = await create(1);
    for (let index = 0; index < 5; index++) {
      const current = await round(id);
      expect(current.duration).toBe([0.1, 0.5, 2, 8, 15][index]);
      const response = (await answer(id, current, null)).json<AnswerResponse>();
      expect(response.roundFinished).toBe(index === 4);
      expect(response.correctAnswer !== undefined).toBe(index === 4);
    }
    const result = (await application.app.inject({ url: `/games/${id}/result`, headers: headers() })).json();
    expect(result).toMatchObject({ score: 0, correctAnswers: 0, status: 'COMPLETED' });
    expect(await database.db.guessAttempt.count({ where: { round: { gameId: id } } })).toBe(5);
  });
  it('não desconta pontos pelo tempo de carregamento ou reflexão', async () => {
    const id = await create(1); const current = await round(id);
    await database.db.gameRound.update({ where: { id: current.roundId }, data: { startedAt: new Date(Date.now() - 120000) } });
    expect((await answer(id, current)).json()).toMatchObject({ correct: true, points: 1200 });
  });
  it('serializa acertos e pulos concorrentes sem duas tentativas ou duas pontuações', async () => {
    const id = await create(); const current = await round(id);
    const replies = await Promise.all([answer(id, current), answer(id, current, null)]);
    expect(replies.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect(await database.db.guessAttempt.count({ where: { roundId: current.roundId } })).toBe(1);
  });
  it('protege outro jogador, rodada estrangeira e parâmetros do áudio', async () => {
    const id = await create(); const current = await round(id); const foreign = await round(await create());
    expect((await answer(id, foreign)).statusCode).toBe(409);
    expect((await application.app.inject({ url: current.previewUrl })).statusCode).toBe(401);
    const session = await application.app.inject({ method: 'POST', url: '/sessions' });
    expect((await application.app.inject({ url: current.previewUrl, headers: { authorization: `Bearer ${session.json<{ accessToken: string }>().accessToken}` } })).statusCode).toBe(404);
    expect((await application.app.inject({ url: current.previewUrl + '&duration=15', headers: headers() })).statusCode).toBe(400);
    expect((await application.app.inject({ url: current.previewUrl.replace('attempt=0', 'attempt=4'), headers: headers() })).statusCode).toBe(409);
    const clip = await application.app.inject({ url: current.previewUrl, headers: headers() });
    expect(clip.headers['content-type']).toBe('audio/wav'); expect(clip.headers['cache-control']).toContain('no-store');
  });
  it('substitui fonte indisponível sem mexer no score, mantendo auditoria e bloqueando pedidos antigos', async () => {
    const id = await create(1); const first = await round(id);
    await answer(id, first, null); const current = await round(id);
    await database.db.gameRound.update({ where: { id: current.roundId }, data: { audioUrl: 'https://audio-ssl.itunes.apple.com/unavailable' } });
    const repaired = await round(id);
    expect(repaired).toMatchObject({ attempt: 0, revision: 1, duration: 0.1, guesses: [], replaced: true });
    expect((await answer(id, current)).statusCode).toBe(409);
    expect(await database.db.guessAttempt.count({ where: { roundId: current.roundId, revision: 0 } })).toBe(1);
    expect((await database.db.game.findUniqueOrThrow({ where: { id } })).score).toBe(0);
  });
  it('mantém quarentena mesmo sem substituta e não repete título na recuperação', async () => {
    const id = await create(1);
    const target = await database.db.gameRound.findFirstOrThrow({ where: { gameId: id }, include: { song: true } });
    const other = await database.db.song.findFirstOrThrow({ where: { id: { not: target.songId }, artistId: { not: target.song.artistId } } });
    const repo = new SongRepository(database.db);
    const pool = await repo.playable();
    const onlySameTitle = pool.filter(song => song.id === other.id).map(song => ({ ...song, normalizedTitle: target.song.normalizedTitle }));
    const mock = vi.spyOn(SongRepository.prototype, 'playable').mockResolvedValue(onlySameTitle);
    try {
      await database.db.song.update({ where: { id: target.songId }, data: { previewUrl: 'https://audio-ssl.itunes.apple.com/unavailable' } });
      await database.db.gameRound.update({ where: { id: target.id }, data: { audioUrl: 'https://audio-ssl.itunes.apple.com/unavailable' } });
      expect((await application.app.inject({ url: '/games/' + id + '/round', headers: headers() })).statusCode).toBe(503);
      const failed = await database.db.song.findUniqueOrThrow({ where: { id: target.songId } });
      expect(failed.audioUnavailableUntil!.getTime()).toBeGreaterThan(Date.now());
      expect((await database.db.gameRound.findUniqueOrThrow({ where: { id: target.id } })).songId).toBe(target.songId);
      expect(await database.db.guessAttempt.count({ where: { roundId: target.id } })).toBe(0);
    } finally {
      mock.mockRestore();
      await database.db.song.update({ where: { id: target.songId }, data: { previewUrl: target.song.previewUrl, audioUnavailableUntil: null } });
    }
  });
  it('não consome tentativa nem bloqueia catálogo numa falha temporária de rede', async () => {
    const id = await create(1);
    const target = await database.db.gameRound.findFirstOrThrow({ where: { gameId: id } });
    await database.db.gameRound.update({ where: { id: target.id }, data: { audioUrl: 'https://audio-ssl.itunes.apple.com/outage' } });
    expect((await application.app.inject({ url: `/games/${id}/round`, headers: headers() })).statusCode).toBe(502);
    expect(await database.db.guessAttempt.count({ where: { roundId: target.id } })).toBe(0);
    expect((await database.db.song.findUniqueOrThrow({ where: { id: target.songId } })).audioUnavailableUntil).toBeNull();
  });
  it('preserva histórico antigo e exclui suas regras do ranking novo', async () => {
    const id = await create(1); await database.db.game.update({ where: { id }, data: { rulesVersion: 1 } });
    expect((await application.app.inject({ url: `/games/${id}/round`, headers: headers() })).statusCode).toBe(410);
    expect((await application.app.inject({ url: `/games/${id}`, headers: headers() })).json()).toMatchObject({ status: 'EXPIRED' });
  });
  it('conclui dez músicas e publica o resultado nas três janelas de ranking', async () => {
    const id = await create();
    for (let i = 0; i < 10; i++) expect((await answer(id, await round(id))).json()).toMatchObject({ correct: true, roundFinished: true });
    const result = (await application.app.inject({ url: `/games/${id}/result`, headers: headers() })).json();
    expect(result).toMatchObject({ status: 'COMPLETED', correctAnswers: 10, maxStreak: 10 });
    expect(result.rounds).toHaveLength(10);
    for (const period of ['daily', 'weekly', 'all-time'])
      expect((await application.app.inject('/rankings/' + period)).json<{ entries: unknown[] }>().entries).toHaveLength(1);
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
    const quarantine = new Date(Date.now() + 86400000);
    await database.db.song.update({ where: { id: stored.id }, data: { audioUnavailableUntil: quarantine } });
    await repository.ingest(artist, { ...base, trackId: 999002, trackName: 'Obra' });
    expect((await database.db.song.findUniqueOrThrow({ where: { id: stored.id } })).audioUnavailableUntil).toEqual(quarantine);
    await repository.ingest(artist, { ...base, trackId: 999002, trackName: 'Obra', previewUrl: 'https://audio-ssl.itunes.apple.com/new.m4a' });
    expect((await database.db.song.findUniqueOrThrow({ where: { id: stored.id } })).audioUnavailableUntil).toBeNull();
    await repository.ingest(artist, { ...base, trackId: 999002, trackName: 'Obra', previewUrl: undefined });
    expect((await database.db.song.findUniqueOrThrow({ where: { id: stored.id } })).active).toBe(false);
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
