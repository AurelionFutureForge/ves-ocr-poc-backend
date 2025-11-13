import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(8001),
  ALLOWED_ORIGINS: z.string().transform((val) => val.split(',').map((origin) => origin.trim()).filter(Boolean)),
  ACCESS_TOKEN_SECRET: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables!', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
