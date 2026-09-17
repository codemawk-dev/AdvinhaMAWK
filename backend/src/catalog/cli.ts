import { parseArgs } from 'node:util';
import { z } from 'zod';
import { buildApp } from '../app.js';
import { readConfig } from '../core/config.js';
import { seedArtists } from './seed.js';
import { syncToMinimum } from './import.js';
const config = readConfig();
const { values } = parseArgs({ options: { 'until-artist': { type: 'string' }, 'after-artist': { type: 'string' }, expand: { type: 'boolean' }, all: { type: 'boolean' }, batch: { type: 'boolean' }, 'min-songs': { type: 'string' } }, strict: true });
if ([values.expand, values.all, values.batch, values['min-songs'] !== undefined].filter(Boolean).length > 1) throw new Error('Use apenas --expand, --all, --batch ou --min-songs N.');
if ((values['after-artist'] || values['until-artist']) && !values.expand) throw new Error('Os limites de artistas exigem --expand.');
const afterArtist = values['after-artist'] ? z.uuid().parse(values['after-artist']) : undefined;
const untilArtist = values['until-artist'] ? z.uuid().parse(values['until-artist']) : undefined;
const minimum = z.coerce.number().int().min(1).max(100000).parse(values['min-songs'] ?? config.CATALOG_MIN_SONGS);
const { app, db, catalog } = await buildApp(config);
try {
  await seedArtists(db);
  if (values.expand) {
    console.log(JSON.stringify(await catalog.expandKnownArtists(afterArtist, untilArtist)));
  } else if (values.all || values.batch) {
    do {
      const result = await catalog.syncBatch();
      console.log(JSON.stringify(result));
      if (result.busy || !result.artists || !values.all) break;
    } while (values.all);
  } else {
    await syncToMinimum({ syncBatch: () => catalog.syncBatch(), countPlayable: () => db.song.count({ where: { active: true, artist: { active: true } } }) },
      minimum, progress => console.log(JSON.stringify({ event: 'catalog.progress', ...progress })));
  }
} catch (error) {
  app.log.error({ err: error }, 'catalog.import.failed');
  process.exitCode = 1;
} finally { await app.close(); }
