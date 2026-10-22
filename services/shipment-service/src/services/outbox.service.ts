import amqp from 'amqplib';
import { shipmentRepository } from '../repositories/shipment.repository';
import { OutboxEvent } from '../types/shipment.types';
import { env } from '../config/env';
import { logger } from '../config/logger';

export class ShipmentOutboxWorker {
  private connection: any = null;
  private channel: any = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isRunning = false;

  async initRabbitMQ(): Promise<void> {
    if (!env.RABBITMQ_ENABLED) return;
    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createConfirmChannel();
      await this.channel.assertExchange(env.RABBITMQ_EXCHANGE, 'topic', { durable: true });
      logger.info('Shipment Service connected to RabbitMQ (exchange: %s)', env.RABBITMQ_EXCHANGE);
    } catch (err) {
      logger.warn({ err }, 'Shipment Service RabbitMQ connection failed. Will retry during poll.');
      this.channel = null;
      this.connection = null;
    }
  }

  async publish(event: OutboxEvent): Promise<boolean> {
    if (!env.RABBITMQ_ENABLED) {
      logger.info({ eventId: event.id, eventType: event.eventType }, '[Shipment Outbox] Log only mode');
      return true;
    }

    if (!this.channel) {
      await this.initRabbitMQ();
      if (!this.channel) throw new Error('RabbitMQ channel unavailable');
    }

    const exchange = env.RABBITMQ_EXCHANGE;
    const routingKey = event.eventType;
    const content = Buffer.from(JSON.stringify(event.payload));

    return new Promise<boolean>((resolve, reject) => {
      this.channel.publish(
        exchange,
        routingKey,
        content,
        {
          persistent: true,
          contentType: 'application/json',
          messageId: event.id,
          timestamp: new Date(event.createdAt).getTime()
        },
        (err: any) => {
          if (err) return reject(err);
          resolve(true);
        }
      );
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.initRabbitMQ();

    this.intervalTimer = setInterval(() => {
      this.processBatch().catch((err) => {
        logger.error({ err }, 'Error during shipment outbox poll cycle');
      });
    }, env.OUTBOX_POLL_INTERVAL_MS);

    logger.info({ pollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS }, 'Shipment outbox worker started');
  }

  async processBatch(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;
    let count = 0;

    try {
      const pending = await shipmentRepository.fetchPendingOutbox(env.OUTBOX_BATCH_SIZE, env.OUTBOX_MAX_ATTEMPTS);
      for (const event of pending) {
        try {
          await this.publish(event);
          await shipmentRepository.markOutboxPublished(event.id);
          count++;
        } catch (error: any) {
          const nextAttempt = event.attempts + 1;
          const backoff = Math.min(300, Math.pow(2, nextAttempt) * 5);
          const nextAttemptAt = new Date(Date.now() + backoff * 1000);
          await shipmentRepository.recordOutboxFailure(event.id, error.message || 'Error', nextAttemptAt, nextAttempt);
        }
      }
    } catch (err) {
      logger.debug({ err }, 'Error polling shipment outbox');
    } finally {
      this.isProcessing = false;
    }

    return count;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch (err) {
      // Ignore cleanup error
    }
    logger.info('Shipment outbox worker stopped');
  }
}

export const shipmentOutboxWorker = new ShipmentOutboxWorker();
