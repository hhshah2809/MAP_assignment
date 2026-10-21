import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().default('/api/v1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1).default('logistics_orders'),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),

  DB_NAME_TEST: z.string().min(1).default('logistics_orders_test'),

  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173,http://localhost:3001')
    .transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean)),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  IDEMPOTENCY_KEY_TTL_HOURS: z.coerce.number().int().positive().default(24),

  RABBITMQ_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  RABBITMQ_URL: z.string().default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_ORDER_EXCHANGE: z.string().default('logistics.orders.exchange'),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Environment configuration error:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
