import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Transfers this local catalog only. Credentials stay in the backend environment.
const sourceUrl = new URL(process.env.DATABASE_URL ?? '');
const endpoint = new URL(process.env.SUPABASE_URL ?? '');
const secret = process.env.SUPABASE_SECRET_KEY;
if (!['localhost', '127.0.0.1'].includes(sourceUrl.hostname)) throw new Error('A origem precisa ser o banco local.');
if (endpoint.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(endpoint.hostname) || !secret) throw new Error('Configure SUPABASE_URL e SUPABASE_SECRET_KEY.');
const source = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
async function request(table: string, rows?: unknown[]) {
  const response = await fetch(new URL(`/rest/v1/${table}${rows ? '?on_conflict=id' : '?select=id&limit=1'}`, endpoint), {
    method: rows ? 'POST' : 'GET',
    headers: { apikey: secret!, 'Content-Type': 'application/json', Prefer: rows ? 'resolution=ignore-duplicates,return=minimal' : 'count=exact' },
    ...(rows ? { body: JSON.stringify(rows) } : {}), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Falha em ${table}: HTTP ${response.status}. Verifique schema e permissões de serviço.`);
  return Number(response.headers.get('content-range')?.split('/')[1] ?? 0);
}
async function existingIds(table: string): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let offset = 0; ;) {
    const response = await fetch(new URL('/rest/v1/' + table + '?select=id&order=id.asc&limit=1000&offset=' + offset, endpoint), {
      headers: { apikey: secret! }, signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('Falha em ' + table + ': HTTP ' + response.status + '.');
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || rows.some(row => typeof row?.id !== 'string')) throw new Error('Invalid catalog identifiers');
    for (const row of rows) ids.add(row.id);
    if (!rows.length) return ids;
    offset += rows.length;
  }
}
try {
  const tables = [
    ['InternalCategory', await source.internalCategory.findMany()],
    ['Artist', await source.artist.findMany()],
    ['Song', await source.song.findMany()],
  ] as const;
  for (const [table, rows] of tables) {
    const known = await existingIds(table);
    const missing = rows.filter(row => !known.has(row.id));
    console.log(JSON.stringify({ table, source: rows.length, missing: missing.length }));
    for (let offset = 0; offset < missing.length; offset += 250) {
      await request(table, missing.slice(offset, offset + 250));
      console.log(JSON.stringify({ table, transferred: Math.min(offset + 250, missing.length), total: missing.length }));
    }
    const count = await request(table);
    if (count < rows.length) throw new Error(`Contagem insuficiente em ${table}.`);
    console.log(JSON.stringify({ verified: table, remoteCount: count }));
  }
} catch (error) {
  console.error(error instanceof Error && error.message.startsWith('Falha em') ? error.message : 'Transferência incompleta. Verifique a conexão e execute novamente; IDs existentes são preservados.');
  process.exitCode = 1;
} finally { await source.$disconnect(); }
