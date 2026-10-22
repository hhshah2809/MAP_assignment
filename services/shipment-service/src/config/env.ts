import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3002),
  API_PREFIX: z.string().default('/api/v1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().default('logistics_shipments'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173,http://localhost:3001,http://localhost:3002')
    .transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean)),

  RABBITMQ_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  RABBITMQ_URL: z.string().default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: z.string().default('logistics.events'),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Environment configuration error (shipment-service):', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
