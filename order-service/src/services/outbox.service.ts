import amqp from 'amqplib';
import { outboxRepository } from '../repositories/outbox.repository';
import { OutboxEvent } from '../types/order.types';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface IEventPublisher {
  init(): Promise<void>;
  publish(event: OutboxEvent): Promise<boolean>;
  close(): Promise<void>;
}

export class RabbitMQPublisher implements IEventPublisher {
  private connection: any = null;
  private channel: any = null;

  async init(): Promise<void> {
    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createConfirmChannel();
      await this.channel.assertExchange(env.RABBITMQ_ORDER_EXCHANGE, 'topic', { durable: true });
      logger.info('Connected to RabbitMQ and asserted exchange: %s', env.RABBITMQ_ORDER_EXCHANGE);
    } catch (err) {
      logger.warn({ err }, 'Could not connect to RabbitMQ broker; will retry on next poll cycle.');
      this.channel = null;
      this.connection = null;
    }
  }

  async publish(event: OutboxEvent): Promise<boolean> {
    if (!this.channel) {
      await this.init();
      if (!this.channel) {
        throw new Error('RabbitMQ channel is not available.');
      }
    }

    const exchange = env.RABBITMQ_ORDER_EXCHANGE;
    const routingKey = event.eventType;
    const content = Buffer.from(JSON.stringify(event.payload));

    return new Promise<boolean>((resolve, reject) => {
      this.channel!.publish(
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
          if (err) {
            return reject(err);
          }
          resolve(true);
        }
      );
    });
  }

  async close(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch (err) {
      logger.debug({ err }, 'Error closing RabbitMQ connection');
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }
}

export class LogOnlyPublisher implements IEventPublisher {
  async init(): Promise<void> {
    logger.info('LogOnlyPublisher initialized. (Set RABBITMQ_ENABLED=true to dispatch to AMQP broker)');
  }

  async publish(event: OutboxEvent): Promise<boolean> {
    logger.info(
      {
        eventId: event.id,
        eventType: event.eventType,
        aggregateId: event.aggregateId
      },
      '[Outbox Event Processed] Event published to local bus / log'
    );
    return true;
  }

  async close(): Promise<void> {
    // No-op
  }
}

export class OutboxWorker {
  private publisher: IEventPublisher;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isRunning = false;

  constructor() {
    this.publisher = env.RABBITMQ_ENABLED ? new RabbitMQPublisher() : new LogOnlyPublisher();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.publisher.init();

    // Poll periodically
    this.intervalTimer = setInterval(() => {
      this.processOutboxBatch().catch((err) => {
        logger.error({ err }, 'Error during outbox processing cycle');
      });
    }, env.OUTBOX_POLL_INTERVAL_MS);

    logger.info(
      { pollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS },
      'Outbox worker started'
    );
  }

  async processOutboxBatch(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    let processedCount = 0;

    try {
      const pendingEvents = await outboxRepository.fetchPendingEvents(
        env.OUTBOX_BATCH_SIZE,
        env.OUTBOX_MAX_ATTEMPTS
      );

      for (const event of pendingEvents) {
        try {
          await this.publisher.publish(event);
          await outboxRepository.markPublished(event.id);
          processedCount++;
        } catch (error: any) {
          const nextAttempt = event.attempts + 1;
          const backoffSeconds = Math.min(300, Math.pow(2, nextAttempt) * 5);
          const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);

          logger.warn(
            { eventId: event.id, attempts: nextAttempt, err: error.message },
            'Failed to publish outbox event. Scheduling retry.'
          );

          await outboxRepository.recordFailure(
            event.id,
            error.message || 'Unknown error',
            nextAttemptAt,
            nextAttempt
          );
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    await this.publisher.close();
    logger.info('Outbox worker stopped');
  }
}

export const outboxWorker = new OutboxWorker();
