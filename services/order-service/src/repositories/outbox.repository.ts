import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '../config/database';
import { OutboxEvent } from '../types/order.types';

export class OutboxRepository {
  async insertEvent(
    event: {
      id: string;
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      eventVersion: number;
      payload: Record<string, unknown>;
    },
    conn: PoolConnection
  ): Promise<void> {
    await conn.query(
      `INSERT INTO outbox_events (
        id, aggregate_type, aggregate_id, event_type, event_version, payload, status, attempts, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, UTC_TIMESTAMP(3))`,
      [
        event.id,
        event.aggregateType,
        event.aggregateId,
        event.eventType,
        event.eventVersion,
        JSON.stringify(event.payload)
      ]
    );
  }

  async fetchPendingEvents(
    batchSize: number,
    maxAttempts: number,
    conn?: PoolConnection
  ): Promise<OutboxEvent[]> {
    const executor = conn || getDatabasePool();
    const [rows] = await executor.query<RowDataPacket[]>(
      `SELECT id, aggregate_type, aggregate_id, event_type, event_version, payload, status, attempts, next_attempt_at, last_error, created_at, published_at
       FROM outbox_events
       WHERE status = 'PENDING'
         AND attempts < ?
         AND (next_attempt_at IS NULL OR next_attempt_at <= UTC_TIMESTAMP(3))
       ORDER BY created_at ASC
       LIMIT ?`,
      [maxAttempts, batchSize]
    );

    return rows.map((row) => ({
      id: row.id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      eventType: row.event_type,
      eventVersion: Number(row.event_version),
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      status: row.status,
      attempts: Number(row.attempts),
      nextAttemptAt: row.next_attempt_at,
      lastError: row.last_error,
      createdAt: row.created_at,
      publishedAt: row.published_at
    }));
  }

  async markPublished(id: string, conn?: PoolConnection): Promise<void> {
    const executor = conn || getDatabasePool();
    await executor.query(
      `UPDATE outbox_events
       SET status = 'PUBLISHED', published_at = UTC_TIMESTAMP(3), last_error = NULL
       WHERE id = ?`,
      [id]
    );
  }

  async recordFailure(
    id: string,
    error: string,
    nextAttemptAt: Date,
    attempts: number,
    conn?: PoolConnection
  ): Promise<void> {
    const executor = conn || getDatabasePool();
    await executor.query(
      `UPDATE outbox_events
       SET attempts = ?, next_attempt_at = ?, last_error = ?
       WHERE id = ?`,
      [attempts, nextAttemptAt, error.slice(0, 2000), id]
    );
  }
}

export const outboxRepository = new OutboxRepository();
