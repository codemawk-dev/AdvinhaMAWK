import { readConfig } from '../src/core/config.js';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedArtists } from '../src/catalog/seed.js';
const db = new PrismaClient({ datasourceUrl: readConfig().DATABASE_URL });
try { console.log(JSON.stringify({ seededArtists: await seedArtists(db) })); }
finally { await db.$disconnect(); }
