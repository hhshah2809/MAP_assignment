import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { pool } from './config/database';
import { shipmentOutboxWorker } from './services/outbox.service';
import { rabbitMQConsumer } from './services/consumer.service';

const app = createApp();

const server = app.listen(env.PORT, async () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Shipment Service started successfully');

  if (env.RABBITMQ_ENABLED) {
    await shipmentOutboxWorker.start();
    await rabbitMQConsumer.start();
  }
});

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal. Commencing graceful termination...');

  server.close(async () => {
    logger.info('HTTP server closed');

    await shipmentOutboxWorker.stop();
    await rabbitMQConsumer.stop();

    try {
      await pool.end();
      logger.info('PostgreSQL pool drained');
    } catch (err) {
      logger.error({ err }, 'Error during PostgreSQL pool shutdown');
    }

    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forceful shutdown triggered after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
