import { transferCatalog } from '../src/catalog/transfer.js';
import 'dotenv/config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';
const execute = promisify(execFile);
const connection = process.env.SUPABASE_DATABASE_URL;
if (!connection) throw new Error('Configure SUPABASE_DATABASE_URL com a conexão PostgreSQL completa no .env.');
const endpoint = new URL(process.env.SUPABASE_URL ?? '');
const target = new URL(connection);
const projectRef = endpoint.hostname.split('.')[0]!;
if (!['postgres:', 'postgresql:'].includes(target.protocol) || !target.password ||
    !(target.hostname === `db.${projectRef}.supabase.co` || (target.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(target.username).endsWith(`.${projectRef}`)))) {
  throw new Error('A conexão PostgreSQL precisa apontar para o mesmo projeto de SUPABASE_URL e conter a senha do banco.');
}
if (target.port === '6543') throw new Error('Use a conexão direta ou Session pooler (porta 5432) para migrations.');
const db = new PrismaClient({ datasourceUrl: connection });
try {
  await db.$connect();
  console.log(JSON.stringify({ event: 'supabase.connected', projectRef }));
  // Never print child errors: Prisma messages can contain connection information.
  await execute(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { windowsHide: true, env: process.env });
  console.log(JSON.stringify({ event: 'supabase.migrated' }));
  if (process.env.DATABASE_URL && process.env.DATABASE_URL !== connection) {
    const sourceUrl = new URL(process.env.DATABASE_URL);
    // Only transfer from this project's local development database, never an unrelated remote database.
    if (['localhost', '127.0.0.1'].includes(sourceUrl.hostname)) {
      const source = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
      try {
        await source.$connect();
        await transferCatalog(source, db, inserted => console.log(JSON.stringify({ event: 'supabase.catalog.transferred', inserted })));
      } catch { console.log(JSON.stringify({ event: 'supabase.local-transfer.unavailable', message: 'A importação continuará diretamente no Supabase.' })); }
      finally { await source.$disconnect(); }
    }
  }
  // CLI seeds every configured artist and counts persisted playable songs to reach the target.
  await execute(process.execPath, ['--import', 'tsx', 'src/catalog/cli.ts'], { windowsHide: true, env: process.env, maxBuffer: 16 * 1024 * 1024, timeout: 3600000 });
  const [artists, songs] = await Promise.all([db.artist.count(), db.song.count({ where: { active: true, artist: { active: true } } })]);
  console.log(JSON.stringify({ event: 'supabase.ready', projectRef, artists, playableSongs: songs }));
} catch {
  console.error('Não foi possível completar a configuração do Supabase. Confira a conexão PostgreSQL, migrations e status do catálogo.');
  process.exitCode = 1;
} finally { await db.$disconnect(); }
