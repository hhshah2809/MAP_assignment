import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';

export interface MigrationOptions {
  database?: string;
  silent?: boolean;
}

export async function runMigrations(options: MigrationOptions = {}): Promise<void> {
  const targetDb = options.database || (env.NODE_ENV === 'test' ? env.DB_NAME_TEST : env.DB_NAME);
  const log = options.silent ? { info: () => {}, error: console.error } : logger;

  log.info({ targetDb }, 'Starting database migrations...');

  // 1. Connect without database selected to ensure target database exists
  const adminConn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    timezone: 'Z'
  });

  try {
    await adminConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
  } finally {
    await adminConn.end();
  }

  // 2. Connect to the target database
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: targetDb,
    timezone: 'Z',
    multipleStatements: true
  });

  try {
    // 3. Ensure schema_migrations table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Fetch already applied migrations
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT name FROM schema_migrations ORDER BY id ASC'
    );
    const appliedMigrations = new Set(rows.map((row) => row.name));

    // 5. Read migration files from migrations directory
    const migrationsDir = path.resolve(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        continue;
      }

      log.info({ migration: file }, `Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      try {
        // Execute migration SQL (multiple statements supported)
        await connection.query(sqlContent);

        // Record migration in schema_migrations
        await connection.query(
          'INSERT INTO schema_migrations (name, applied_at) VALUES (?, UTC_TIMESTAMP(3))',
          [file]
        );

        appliedCount++;
        log.info({ migration: file }, `Successfully applied: ${file}`);
      } catch (err) {
        log.error({ migration: file, err }, `Failed to apply migration: ${file}`);
        throw err;
      }
    }

    if (appliedCount === 0) {
      log.info('All migrations are already up to date.');
    } else {
      log.info({ appliedCount }, `Successfully applied ${appliedCount} migration(s).`);
    }
  } finally {
    await connection.end();
  }
}

// When run directly from CLI
if (require.main === module) {
  runMigrations()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('✅ Migrations completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('❌ Migration error:', err);
      process.exit(1);
    });
}
