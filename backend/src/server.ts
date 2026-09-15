import { buildApp } from './app.js';
import { readConfig } from './core/config.js';
import { startScheduler } from './catalog/service.js';
const config = readConfig();
const { app, db, catalog } = await buildApp(config);
await db.$connect();
const stopScheduler = config.SCHEDULER_ENABLED ? startScheduler(catalog, config.CATALOG_INTERVAL_MS, app.log) : async () => {};
app.addHook('preClose', stopScheduler);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close().catch(error => { app.log.error(error); process.exitCode = 1; }); });
try { await app.listen({ port: config.PORT, host: config.HOST }); }
catch (error) { app.log.error(error); await app.close(); process.exitCode = 1; }
