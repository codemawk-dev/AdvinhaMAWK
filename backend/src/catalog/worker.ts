import { buildApp } from '../app.js';
import { readConfig } from '../core/config.js';
import { startScheduler } from './service.js';
const config = readConfig();
const { app, db, catalog } = await buildApp(config);
await db.$connect();
const stop = startScheduler(catalog, config.CATALOG_INTERVAL_MS, app.log);
// Keep a standalone worker alive even when its scheduler timer is unref'ed.
const keepAlive = setInterval(() => {}, 3600000);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
  void stop().then(async () => { clearInterval(keepAlive); await app.close(); });
});
