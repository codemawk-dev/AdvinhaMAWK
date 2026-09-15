import { AppError } from '../core/errors.js';
export interface CatalogProgress {
  target: number;
  playableSongs: number;
  batches: number;
}
export interface CatalogImporter {
  countPlayable(): Promise<number>;
  syncBatch(): Promise<{ busy: boolean; artists: number }>;
}
// Count committed, distinct catalogue rows, never the upsert counter (which includes updates).
export async function syncToMinimum(importer: CatalogImporter, target: number, onProgress: (progress: CatalogProgress) => void = () => {}): Promise<CatalogProgress> {
  if (!Number.isSafeInteger(target) || target < 1 || target > 100000) throw new Error('Meta de catálogo inválida.');
  let playableSongs = await importer.countPlayable();
  let batches = 0;
  onProgress({ target, playableSongs, batches });
  while (playableSongs < target) {
    const batch = await importer.syncBatch();
    if (batch.busy) throw new AppError(409, 'CATALOG_SYNC_BUSY', 'Já existe uma sincronização em execução. Aguarde e repita o comando.');
    playableSongs = await importer.countPlayable();
    batches++;
    onProgress({ target, playableSongs, batches });
    if (!batch.artists && playableSongs < target) {
      throw new AppError(503, 'CATALOG_TARGET_UNREACHED', `Catálogo com ${playableSongs}/${target} músicas jogáveis. Verifique erros de artistas e próximos horários no status administrativo ou amplie a lista de artistas.`);
    }
  }
  return { target, playableSongs, batches };
}
