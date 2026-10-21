import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { closePool, checkDatabaseConnection } from './config/database';
import { outboxWorker } from './services/outbox.service';

const server = http.createServer(app);

async function startServer(): Promise<void> {
  // Check database connectivity
  const isDbReady = await checkDatabaseConnection();
  if (!isDbReady) {
    logger.warn('Initial MySQL connection check failed. The service will still boot and serve /health while retrying.');
  } else {
    logger.info('MySQL database connected successfully.');
  }

  // Start background outbox publisher
  await outboxWorker.start();

  server.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        nodeEnv: env.NODE_ENV,
        apiPrefix: env.API_PREFIX
      },
      `🚀 Order Service is running on http://localhost:${env.PORT}`
    );
  });
}

// Graceful shutdown
let isShuttingDown = false;

async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, `Received ${signal}. Initiating graceful shutdown...`);

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error during HTTP server shutdown');
    } else {
      logger.info('HTTP server stopped accepting connections.');
    }

    try {
      // Stop background workers
      await outboxWorker.stop();

      // Close MySQL connection pool
      await closePool();

      logger.info('Graceful shutdown completed. Exiting process.');
      process.exit(0);
    } catch (shutdownErr) {
      logger.error({ shutdownErr }, 'Error during cleanup shutdown sequence');
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if graceful exit hangs
  setTimeout(() => {
    logger.error('Shutdown timeout reached (10s). Forcing immediate termination.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception detected! Initiating emergency shutdown.');
  handleShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Rejection detected! Initiating emergency shutdown.');
  handleShutdown('unhandledRejection');
});

startServer().catch((err) => {
  logger.fatal({ err }, 'Failed to start Order Service.');
  process.exit(1);
});
