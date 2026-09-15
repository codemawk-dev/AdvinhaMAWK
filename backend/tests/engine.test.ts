import { editorialWeights } from '../src/catalog/curation.js';
import { describe, expect, it } from 'vitest';
import { normalizeName, normalizeTitle, versionRank } from '../src/catalog/normalization.js';
import { GameSelectionService, decade } from '../src/games/engine.js';
import { progressivePoints } from '../src/games/rules.js';
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
describe('seleção do catálogo', () => {
  const pool = Array.from({ length: 90 }, (_, i) => song(i));
  it('varia estilos, artistas e épocas em múltiplas partidas', () => {
    for (let seed = 0; seed < 30; seed++) {
      const engine = new GameSelectionService(seededRandom(seed));
      const selected = engine.select(pool, 10, new Set());
      expect(new Set(selected.map(s => s.id)).size).toBe(10);
      expect(new Set(selected.map(s => s.artistId)).size).toBe(10);
      for (const group of new Set(selected.map(s => s.artist.categoryId))) expect(selected.filter(s => s.artist.categoryId === group).length).toBeLessThanOrEqual(2);
      expect(new Set(selected.map(decade)).size).toBeGreaterThan(2);
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
  it('permite uma música sem precisar gerar alternativas', () => expect(new GameSelectionService().select(pool.slice(0, 1), 1, new Set())).toHaveLength(1));
  it('usa ano original editorial em vez do ano da reedição', () => expect(decade({ ...pool[0]!, originalYear: 1982, releaseDate: new Date('2025-01-01') })).toBe(1980));
});
describe('pontuação e períodos', () => {
  it('reduz pontos a cada pista e não usa tempo de rede ou cronômetro', () => {
    expect([0, 1, 2, 3, 4].map(index => progressivePoints(index, 1))).toEqual([1200, 1000, 750, 450, 200]);
    expect(progressivePoints(0, 10)).toBe(1560);
  });
  it('delimita dia e semana em São Paulo', () => {
    const now = new Date('2026-09-14T02:00:00Z');
    expect(periodStart('daily', now)?.toISOString()).toBe('2026-09-13T03:00:00.000Z');
    expect(periodStart('weekly', now)?.toISOString()).toBe('2026-09-07T03:00:00.000Z');
    expect(periodStart('all-time', now)).toBeNull();
  });
});
