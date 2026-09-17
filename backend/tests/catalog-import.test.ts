import { describe, expect, it, vi } from 'vitest';
import { syncToMinimum } from '../src/catalog/import.js';
import { readConfig } from '../src/core/config.js';
describe('importação por quantidade mínima', () => {
  it('continua por vários lotes até haver 5000 músicas persistidas', async () => {
    const countPlayable = vi.fn().mockResolvedValueOnce(915).mockResolvedValueOnce(3000).mockResolvedValueOnce(5100);
    const syncBatch = vi.fn().mockResolvedValue({ busy: false, artists: 9, imported: 99999 });
    const progress = vi.fn();
    expect(await syncToMinimum({ countPlayable, syncBatch }, 5000, progress)).toEqual({ target: 5000, playableSongs: 5100, batches: 2 });
    expect(syncBatch).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenCalledTimes(3);
  });
  it('não consulta a Apple se a meta já foi alcançada', async () => {
    const syncBatch = vi.fn();
    expect(await syncToMinimum({ countPlayable: async () => 5001, syncBatch }, 5000)).toMatchObject({ batches: 0, playableSongs: 5001 });
    expect(syncBatch).not.toHaveBeenCalled();
  });
  it('não anuncia sucesso quando acabam artistas elegíveis', async () => {
    await expect(syncToMinimum({ countPlayable: async () => 900, syncBatch: async () => ({ busy: false, artists: 0 }) }, 5000)).rejects.toMatchObject({ code: 'CATALOG_TARGET_UNREACHED' });
  });
  it('para se outro worker já possui o bloqueio', async () => {
    await expect(syncToMinimum({ countPlayable: async () => 900, syncBatch: async () => ({ busy: true, artists: 0 }) }, 5000)).rejects.toMatchObject({ code: 'CATALOG_SYNC_BUSY' });
  });
  it('rejeita metas inválidas antes de fazer consultas', async () => {
    const countPlayable = vi.fn();
    await expect(syncToMinimum({ countPlayable, syncBatch: vi.fn() }, -1)).rejects.toThrow('inválida');
    expect(countPlayable).not.toHaveBeenCalled();
  });
  it('usa Supabase quando configurado e permite isolar testes do banco remoto', () => {
    const env = { DATABASE_URL: 'postgresql://local', SUPABASE_DATABASE_URL: 'postgresql://remote', JWT_SECRET: 'test-secret-with-more-than-32-characters', ADMIN_API_KEY: 'test-admin-key-long-enough' };
    expect(readConfig(env).DATABASE_URL).toBe('postgresql://remote');
    expect(readConfig({ ...env, SUPABASE_DATABASE_URL: '' }).DATABASE_URL).toBe('postgresql://local');
  });
});
