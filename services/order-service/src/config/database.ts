import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { env } from './env';
import { logger } from './logger';

let pool: Pool | null = null;

export interface DatabaseConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectionLimit?: number;
}

export function getDatabasePool(customConfig?: DatabaseConfig): Pool {
  if (pool && !customConfig) {
    return pool;
  }

  const host = customConfig?.host ?? env.DB_HOST;
  const port = customConfig?.port ?? env.DB_PORT;
  const user = customConfig?.user ?? env.DB_USER;
  const password = customConfig?.password ?? env.DB_PASSWORD;
  const database = customConfig?.database ?? (env.NODE_ENV === 'test' ? env.DB_NAME_TEST : env.DB_NAME);
  const connectionLimit = customConfig?.connectionLimit ?? env.DB_CONNECTION_LIMIT;

  const newPool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    timezone: 'Z', // Enforce UTC
    dateStrings: true, // Keep DATETIME/TIMESTAMP as ISO/UTC string
    decimalNumbers: false, // Keep DECIMAL values as strings to prevent floating-point loss
    supportBigNumbers: true,
    bigNumberStrings: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  });

  if (!customConfig) {
    pool = newPool;
  }

  return newPool;
}

export async function checkDatabaseConnection(activePool?: Pool): Promise<boolean> {
  const currentPool = activePool || getDatabasePool();
  try {
    const [rows] = await currentPool.query('SELECT 1 AS healthy');
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    logger.error({ err: error }, 'Database health check failed');
    return false;
  }
}

export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>,
  existingConnection?: PoolConnection,
  activePool?: Pool
): Promise<T> {
  if (existingConnection) {
    // If a connection is already provided as part of an outer transaction, participate in it
    return callback(existingConnection);
  }

  const currentPool = activePool || getDatabasePool();
  const connection = await currentPool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}
