import { describe, expect, it } from 'vitest';
import { filterSongs, preferencesSchema } from '../src/games/preferences.js';
import { song } from './fixtures.js';
describe('preferências musicais', () => {
  it('combina estilos e anos e prioriza ano original sobre reedição', () => {
    const recent = song(1); recent.artist.categoryId = 'pop'; recent.releaseDate = new Date('2020-01-01');
    const old = { ...recent, id: 'old', originalYear: 1980 };
    const other = song(2); other.artist.categoryId = 'rock'; other.releaseDate = new Date('2020-01-01');
    const unknown = { ...recent, id: 'unknown', releaseDate: null };
    expect(filterSongs([recent, old, other, unknown], preferencesSchema.parse({ genres: ['pop'], yearFrom: 2015, yearTo: 2020 }))).toEqual([recent]);
    expect(filterSongs([recent, old, other, unknown], preferencesSchema.parse({}))).toHaveLength(4);
  });
  it('aceita paredão baiano e restringe a seleção ao grupo', () => {
    const track = song(1); track.artist.categoryId = 'paredao_baiano';
    const preferences = preferencesSchema.parse({ genres: ['paredao_baiano'] });
    expect(filterSongs([track, song(2)], preferences)).toEqual([track]);
  });
  it('rejeita período invertido, ano futuro e estilo desconhecido', () => {
    for (const value of [{ yearFrom: 2020, yearTo: 2010 }, { yearTo: 9999 }, { genres: ['inventado'] }]) expect(preferencesSchema.safeParse(value).success).toBe(false);
  });
});
