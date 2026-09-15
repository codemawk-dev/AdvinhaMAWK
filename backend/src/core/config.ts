import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ADMIN_API_KEY: z.string().min(24),
  CATALOG_MIN_SONGS: z.coerce.number().int().min(1).max(100000).default(5000),
  CATALOG_BATCH_SIZE: z.coerce.number().int().min(1).max(30).default(9),
  CATALOG_INTERVAL_MS: z.coerce.number().int().min(10000).default(60000),
  CATALOG_REFRESH_HOURS: z.coerce.number().int().min(1).default(168),
  APPLE_REQUEST_DELAY_MS: z.coerce.number().int().min(3500).default(4000),
  SCHEDULER_ENABLED: z.enum(['true', 'false']).default('true').transform(v => v === 'true'),
  FFMPEG_PATH: z.string().optional(),
});
export type Config = z.infer<typeof schema>;
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const config = schema.parse({ ...env, DATABASE_URL: env.SUPABASE_DATABASE_URL || env.DATABASE_URL });
  if (config.NODE_ENV === 'production' && [config.JWT_SECRET, config.ADMIN_API_KEY].some(v => v.startsWith('development'))) {
    throw new Error('Configure segredos próprios para produção.');
  }
  return config;
}
