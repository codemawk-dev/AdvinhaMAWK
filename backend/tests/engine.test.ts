import { editorialWeights } from '../src/catalog/curation.js';
import { describe, expect, it } from 'vitest';
import { normalizeName, normalizeTitle, versionRank } from '../src/catalog/normalization.js';
import { GameSelectionService, DistractorService, ScoringService, decade } from '../src/games/engine.js';
import { artistGroups } from '../src/catalog/artists.js';
import { periodStart } from '../src/rankings/repository.js';
import { song, seededRandom } from './fixtures.js';
describe('normalização conservadora', () => {
  it('dá peso editorial a títulos reconhecíveis sem inventar métricas Apple', () => {
    expect(editorialWeights('Rita Lee', 'Mania de Você (Ao Vivo)').popularityWeight).toBe(3);
    expect(editorialWeights('Rita Lee', 'Outra canção').popularityWeight).toBe(1);
  });
  it('normaliza acentos e separadores, preservando nomes', () => expect(normalizeName('  Zé Neto & Cristiano ')).toBe('ze neto e cristiano'));
  it.each([
    ['Evidências (Ao Vivo)', 'evidencias'], ['Meu Lugar - Radio Edit', 'meu lugar'],
    ['Amor (feat. Maria)', 'amor'], ['Amor ft. Maria', 'amor'],
    ['Não Quero Dinheiro (Só Quero Amar)', 'nao quero dinheiro so quero amar'],
    ['Live and Let Die', 'live and let die'], ['Ao Vivo e a Cores', 'ao vivo e a cores'],
  ])('%s → %s', (input, expected) => expect(normalizeTitle(input)).toBe(expected));
  it('prioriza estúdio e exclui tributos', () => {
    expect(versionRank('Canção')).toBeLessThan(versionRank('Canção (Ao Vivo)'));
    expect(versionRank('Canção', 'Tributo a artista')).toBe(99);
  });
  it('mantém mais de 180 artistas únicos em nove grupos', () => {
    const names = Object.values(artistGroups).flatMap(g => g.artists).map(normalizeName);
    expect(names.length).toBeGreaterThan(180); expect(new Set(names).size).toBe(names.length);
    expect(Object.keys(artistGroups)).toHaveLength(9);
  });
});
describe('seleção e alternativas', () => {
  const pool = Array.from({ length: 90 }, (_, i) => song(i));
  it('varia estilos, artistas, épocas e durações em múltiplas partidas', () => {
    for (let seed = 0; seed < 30; seed++) {
      const engine = new GameSelectionService(seededRandom(seed));
      const selected = engine.select(pool, 10, new Set());
      expect(new Set(selected.map(s => s.id)).size).toBe(10);
      expect(new Set(selected.map(s => s.artistId)).size).toBe(10);
      for (const group of new Set(selected.map(s => s.artist.categoryId))) expect(selected.filter(s => s.artist.categoryId === group).length).toBeLessThanOrEqual(2);
      expect(new Set(selected.map(decade)).size).toBeGreaterThan(2);
      expect(new Set(engine.durations(10)).size).toBe(5);
    }
  });
  it('reduz repetição recente sem impossibilitar catálogo pequeno', () => {
    const count = (recent: Set<string>) => {
      const engine = new GameSelectionService(seededRandom());
      let hits = 0;
      for (let i = 0; i < 200; i++) hits += engine.select(pool, 1, recent).filter(s => s.id === pool[0]!.id).length;
      return hits;
    };
    expect(count(new Set([pool[0]!.id]))).toBeLessThanOrEqual(count(new Set()));
    expect(new GameSelectionService().select(pool.slice(0, 4), 4, new Set(pool.map(s => s.id)))).toHaveLength(4);
  });
  it('recusa catálogo sem alternativas suficientes', () => expect(() => new GameSelectionService().select(pool.slice(0, 3), 1, new Set())).toThrow('Catálogo insuficiente'));
  it('gera quatro títulos distintos e apenas uma correta', () => {
    const choices = new DistractorService(seededRandom()).options(pool[0]!, pool);
    expect(new Set(choices.map(o => o.title)).size).toBe(4);
    expect(choices.filter(o => o.isCorrect)).toHaveLength(1);
  });
  it('prefere alternativas do mesmo universo musical', () => {
    const service = new DistractorService(seededRandom()); let same = 0;
    for (let i = 0; i < 100; i++) {
      const choices = service.options(pool[0]!, pool).filter(o => !o.isCorrect);
      same += choices.filter(o => pool.find(s => s.title === o.title)!.artist.categoryId === pool[0]!.artist.categoryId).length;
    }
    expect(same).toBeGreaterThan(90);
  });
  it('usa ano original editorial em vez do ano da reedição', () => expect(decade({ ...pool[0]!, originalYear: 1982, releaseDate: new Date('2025-01-01') })).toBe(1980));
});
describe('pontuação e períodos', () => {
  const scoring = new ScoringService();
  const input = { correct: true, duration: 5, responseMs: 5000, streak: 1, difficultyWeight: 1 };
  it('calcula bônus limitado com base exclusivamente nos dados do servidor', () => {
    expect(scoring.calculate(input)).toBe(840);
    expect(scoring.calculate({ ...input, streak: 10 })).toBe(1092);
    expect(scoring.calculate({ ...input, responseMs: 35000 })).toBe(700);
    expect(scoring.calculate({ ...input, correct: false })).toBe(0);
    expect(scoring.calculate({ ...input, responseMs: 60001 })).toBe(0);
  });
  it('delimita dia e semana em São Paulo', () => {
    const now = new Date('2026-09-14T02:00:00Z');
    expect(periodStart('daily', now)?.toISOString()).toBe('2026-09-13T03:00:00.000Z');
    expect(periodStart('weekly', now)?.toISOString()).toBe('2026-09-07T03:00:00.000Z');
    expect(periodStart('all-time', now)).toBeNull();
  });
});
