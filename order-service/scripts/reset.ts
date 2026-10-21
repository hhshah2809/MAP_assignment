import mysql from 'mysql2/promise';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';
import { runMigrations } from './migrate';

export async function resetDatabase(databaseName?: string): Promise<void> {
  const targetDb = databaseName || (env.NODE_ENV === 'test' ? env.DB_NAME_TEST : env.DB_NAME);

  if (env.NODE_ENV === 'production') {
    throw new Error('Database reset is strictly prohibited in production environments.');
  }

  logger.warn({ targetDb }, `Resetting database: ${targetDb}...`);

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    timezone: 'Z'
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${targetDb}\`;`);
    logger.info({ targetDb }, `Database ${targetDb} dropped.`);
  } finally {
    await connection.end();
  }

  // Re-run all migrations
  await runMigrations({ database: targetDb });
  logger.info({ targetDb }, `Database ${targetDb} reset and migrations reapplied.`);
}

if (require.main === module) {
  resetDatabase()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('✅ Database reset completed.');
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('❌ Database reset failed:', err);
      process.exit(1);
    });
}
