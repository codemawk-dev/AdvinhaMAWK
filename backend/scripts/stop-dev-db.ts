import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
const platform = process.platform === 'win32' ? 'windows' : process.platform;
const binaries = await import(`@embedded-postgres/${platform}-${process.arch}`) as { pg_ctl: string };
await promisify(execFile)(binaries.pg_ctl, ['-D', resolve('.local/postgres'), '-m', 'fast', '-w', 'stop'], { windowsHide: true });
console.log('PostgreSQL local encerrado. O catálogo permanece em .local/postgres.');
