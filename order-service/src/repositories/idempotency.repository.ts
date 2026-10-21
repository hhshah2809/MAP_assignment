import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '../config/database';
import { IdempotencyRecord } from '../types/order.types';

export class IdempotencyRepository {
  async findByKey(key: string, conn?: PoolConnection): Promise<IdempotencyRecord | null> {
    const executor = conn || getDatabasePool();
    const [rows] = await executor.query<RowDataPacket[]>(
      `SELECT id, idempotency_key, request_hash, response_status, response_body, order_id, created_at, expires_at
       FROM idempotency_keys
       WHERE idempotency_key = ?`,
      [key]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      idempotencyKey: row.idempotency_key,
      requestHash: row.request_hash,
      responseStatus: row.response_status !== null ? Number(row.response_status) : null,
      responseBody: typeof row.response_body === 'string' ? JSON.parse(row.response_body) : row.response_body,
      orderId: row.order_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at
    };
  }

  async createInitialKey(
    params: {
      id: string;
      key: string;
      requestHash: string;
      expiresAt: Date;
    },
    conn: PoolConnection
  ): Promise<void> {
    await conn.query(
      `INSERT INTO idempotency_keys (id, idempotency_key, request_hash, created_at, expires_at)
       VALUES (?, ?, ?, UTC_TIMESTAMP(3), ?)`,
      [params.id, params.key, params.requestHash, params.expiresAt]
    );
  }

  async saveResponse(
    key: string,
    responseStatus: number,
    responseBody: unknown,
    orderId: string,
    conn?: PoolConnection
  ): Promise<void> {
    const executor = conn || getDatabasePool();
    await executor.query(
      `UPDATE idempotency_keys
       SET response_status = ?, response_body = ?, order_id = ?
       WHERE idempotency_key = ?`,
      [responseStatus, JSON.stringify(responseBody), orderId, key]
    );
  }

  async cleanupExpired(conn?: PoolConnection): Promise<number> {
    const executor = conn || getDatabasePool();
    const [result] = await executor.query<any>(
      `DELETE FROM idempotency_keys WHERE expires_at < UTC_TIMESTAMP(3)`
    );
    return result.affectedRows || 0;
  }
}

export const idempotencyRepository = new IdempotencyRepository();
