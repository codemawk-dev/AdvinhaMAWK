import 'dotenv/config';
import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const url = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('db:local permite somente DATABASE_URL local.');
const directory = resolve(process.env.LOCAL_POSTGRES_DIR || '.local/postgres');
const databaseName = decodeURIComponent(url.pathname.slice(1));
if (!databaseName) throw new Error('DATABASE_URL precisa informar o banco.');
await mkdir(directory, { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir: directory, port: Number(url.port || 5432), user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password), persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {}, onError: () => {},
});
try { await access(resolve(directory, 'PG_VERSION')); }
catch { await pg.initialise(); }
await pg.start();
const client = pg.getPgClient('postgres', '127.0.0.1');
try {
  await client.connect();
  const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (!existing.rowCount) await pg.createDatabase(databaseName);
} catch (error) { await pg.stop(); throw error; }
finally { await client.end(); }
console.log(JSON.stringify({ status: 'ready', directory, port: Number(url.port || 5432), database: databaseName }));
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
  if (stopping) return;
  stopping = true;
  void pg.stop().catch(() => { process.exitCode = 1; });
});
