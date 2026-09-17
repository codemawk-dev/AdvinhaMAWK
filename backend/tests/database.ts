import { mkdtemp, mkdir } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createServer } from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import EmbeddedPostgres from 'embedded-postgres';
import { PrismaClient } from '@prisma/client';
const execute = promisify(execFile);
export async function testDatabase() {
  const root = resolve('.local');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(resolve(root, 'test-postgres-'));
  if (!directory.startsWith(root + sep)) throw new Error('Unsafe database path');
  const port = await new Promise<number>((resolvePort, reject) => {
    const server = createServer(); server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
  const pg = new EmbeddedPostgres({ databaseDir: directory, port, user: 'postgres', password: 'test-only-password',
    persistent: false, initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: () => {} });
  await pg.initialise();
  await pg.start();
  const url = `postgresql://postgres:test-only-password@127.0.0.1:${port}/postgres?schema=public`;
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    await execute(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: url, SUPABASE_DATABASE_URL: '' }, windowsHide: true });
    return { db, url, stop: async () => { await db.$disconnect(); await pg.stop(); } };
  } catch (error) { await db.$disconnect(); await pg.stop(); throw error; }
}
