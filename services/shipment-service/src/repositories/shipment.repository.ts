import { PoolClient } from 'pg';
import { pool } from '../config/database';
import { Shipment, ShipmentStatus, ShipmentStatusHistory, OutboxEvent } from '../types/shipment.types';
import { ListShipmentsQuery } from '../validators/shipment.validator';

export class ShipmentRepository {
  private mapRowToShipment(row: any): Shipment {
    return {
      id: row.id,
      trackingNumber: row.tracking_number,
      orderId: row.order_id,
      carrierName: row.carrier_name,
      truckNumber: row.truck_number,
      driverName: row.driver_name,
      driverPhone: row.driver_phone,
      origin: {
        name: row.origin_name,
        address: row.origin_address,
        city: row.origin_city,
        state: row.origin_state,
        postalCode: row.origin_postal_code,
        countryCode: row.origin_country_code,
        latitude: parseFloat(row.origin_latitude),
        longitude: parseFloat(row.origin_longitude)
      },
      destination: {
        name: row.destination_name,
        address: row.destination_address,
        city: row.destination_city,
        state: row.destination_state,
        postalCode: row.destination_postal_code,
        countryCode: row.destination_country_code,
        latitude: parseFloat(row.destination_latitude),
        longitude: parseFloat(row.destination_longitude)
      },
      scheduledPickup: row.scheduled_pickup ? row.scheduled_pickup.toISOString() : null,
      scheduledDelivery: row.scheduled_delivery ? row.scheduled_delivery.toISOString() : null,
      actualPickup: row.actual_pickup ? row.actual_pickup.toISOString() : null,
      actualDelivery: row.actual_delivery ? row.actual_delivery.toISOString() : null,
      status: row.status as ShipmentStatus,
      notes: row.notes,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      version: row.version
    };
  }

  async create(shipment: Shipment, client?: PoolClient): Promise<Shipment> {
    const query = `
      INSERT INTO shipments (
        id, tracking_number, order_id, carrier_name, truck_number, driver_name, driver_phone,
        origin_name, origin_address, origin_city, origin_state, origin_postal_code, origin_country_code, origin_latitude, origin_longitude,
        destination_name, destination_address, destination_city, destination_state, destination_postal_code, destination_country_code, destination_latitude, destination_longitude,
        scheduled_pickup, scheduled_delivery, status, notes, created_at, updated_at, version
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29, $30
      ) RETURNING *;
    `;
    const values = [
      shipment.id,
      shipment.trackingNumber,
      shipment.orderId,
      shipment.carrierName || null,
      shipment.truckNumber || null,
      shipment.driverName || null,
      shipment.driverPhone || null,
      shipment.origin.name || null,
      shipment.origin.address,
      shipment.origin.city,
      shipment.origin.state || null,
      shipment.origin.postalCode || null,
      shipment.origin.countryCode,
      shipment.origin.latitude,
      shipment.origin.longitude,
      shipment.destination.name || null,
      shipment.destination.address,
      shipment.destination.city,
      shipment.destination.state || null,
      shipment.destination.postalCode || null,
      shipment.destination.countryCode,
      shipment.destination.latitude,
      shipment.destination.longitude,
      shipment.scheduledPickup ? new Date(shipment.scheduledPickup) : null,
      shipment.scheduledDelivery ? new Date(shipment.scheduledDelivery) : null,
      shipment.status,
      shipment.notes || null,
      new Date(shipment.createdAt),
      new Date(shipment.updatedAt),
      shipment.version
    ];

    const executor = client || pool;
    const { rows } = await executor.query(query, values);
    return this.mapRowToShipment(rows[0]);
  }

  async findById(id: string): Promise<Shipment | null> {
    const { rows } = await pool.query('SELECT * FROM shipments WHERE id = $1', [id]);
    if (rows.length === 0) return null;
    return this.mapRowToShipment(rows[0]);
  }

  async findByOrderId(orderId: string): Promise<Shipment | null> {
    const { rows } = await pool.query('SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1', [orderId]);
    if (rows.length === 0) return null;
    return this.mapRowToShipment(rows[0]);
  }

  async list(filters: ListShipmentsQuery): Promise<{ shipments: Shipment[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters.orderId) {
      conditions.push(`order_id = $${idx++}`);
      values.push(filters.orderId);
    }
    if (filters.carrierName) {
      conditions.push(`carrier_name ILIKE $${idx++}`);
      values.push(`%${filters.carrierName}%`);
    }
    if (filters.trackingNumber) {
      conditions.push(`tracking_number ILIKE $${idx++}`);
      values.push(`%${filters.trackingNumber}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM shipments ${whereClause}`, values);
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = filters.limit || 20;
    const offset = ((filters.page || 1) - 1) * limit;

    const listQuery = `
      SELECT * FROM shipments
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const { rows } = await pool.query(listQuery, values);
    return {
      shipments: rows.map((r) => this.mapRowToShipment(r)),
      total
    };
  }

  async updateStatus(
    id: string,
    newStatus: ShipmentStatus,
    client?: PoolClient
  ): Promise<Shipment | null> {
    const query = `
      UPDATE shipments
      SET status = $1, updated_at = NOW(), version = version + 1
      WHERE id = $2
      RETURNING *;
    `;
    const executor = client || pool;
    const { rows } = await executor.query(query, [newStatus, id]);
    if (rows.length === 0) return null;
    return this.mapRowToShipment(rows[0]);
  }

  async updateAssignment(
    id: string,
    carrierName: string,
    truckNumber?: string | null,
    driverName?: string | null,
    driverPhone?: string | null,
    client?: PoolClient
  ): Promise<Shipment | null> {
    const query = `
      UPDATE shipments
      SET carrier_name = $1, truck_number = $2, driver_name = $3, driver_phone = $4,
          status = CASE WHEN status = 'PENDING' THEN 'ASSIGNED' ELSE status END,
          updated_at = NOW(), version = version + 1
      WHERE id = $5
      RETURNING *;
    `;
    const executor = client || pool;
    const { rows } = await executor.query(query, [carrierName, truckNumber || null, driverName || null, driverPhone || null, id]);
    if (rows.length === 0) return null;
    return this.mapRowToShipment(rows[0]);
  }

  async insertHistory(history: ShipmentStatusHistory, client?: PoolClient): Promise<void> {
    const query = `
      INSERT INTO shipment_status_history (
        id, shipment_id, previous_status, new_status, changed_by, reason, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;
    const executor = client || pool;
    await executor.query(query, [
      history.id,
      history.shipmentId,
      history.previousStatus,
      history.newStatus,
      history.changedBy || null,
      history.reason || null,
      new Date(history.createdAt)
    ]);
  }

  async getHistory(shipmentId: string): Promise<ShipmentStatusHistory[]> {
    const { rows } = await pool.query(
      'SELECT * FROM shipment_status_history WHERE shipment_id = $1 ORDER BY created_at ASC',
      [shipmentId]
    );
    return rows.map((r) => ({
      id: r.id,
      shipmentId: r.shipment_id,
      previousStatus: r.previous_status,
      newStatus: r.new_status,
      changedBy: r.changed_by,
      reason: r.reason,
      createdAt: r.created_at.toISOString()
    }));
  }

  async insertOutbox(event: OutboxEvent, client?: PoolClient): Promise<void> {
    const query = `
      INSERT INTO shipment_outbox (
        id, aggregate_type, aggregate_id, event_type, event_version, payload, status, attempts, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
    `;
    const executor = client || pool;
    await executor.query(query, [
      event.id,
      event.aggregateType,
      event.aggregateId,
      event.eventType,
      event.eventVersion,
      JSON.stringify(event.payload),
      event.status,
      event.attempts,
      new Date(event.createdAt)
    ]);
  }

  async fetchPendingOutbox(limit: number, maxAttempts: number): Promise<OutboxEvent[]> {
    const query = `
      SELECT * FROM shipment_outbox
      WHERE status = 'PENDING' AND attempts < $1 AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
      ORDER BY created_at ASC
      LIMIT $2;
    `;
    const { rows } = await pool.query(query, [maxAttempts, limit]);
    return rows.map((r) => ({
      id: r.id,
      aggregateType: r.aggregate_type,
      aggregateId: r.aggregate_id,
      eventType: r.event_type,
      eventVersion: r.event_version,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      status: r.status,
      attempts: r.attempts,
      nextAttemptAt: r.next_attempt_at ? r.next_attempt_at.toISOString() : null,
      lastError: r.last_error,
      createdAt: r.created_at.toISOString(),
      publishedAt: r.published_at ? r.published_at.toISOString() : null
    }));
  }

  async markOutboxPublished(id: string): Promise<void> {
    await pool.query(
      `UPDATE shipment_outbox SET status = 'PUBLISHED', published_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  async recordOutboxFailure(id: string, error: string, nextAttemptAt: Date, attempts: number): Promise<void> {
    await pool.query(
      `UPDATE shipment_outbox SET attempts = $1, last_error = $2, next_attempt_at = $3 WHERE id = $4`,
      [attempts, error, nextAttemptAt, id]
    );
  }
}

export const shipmentRepository = new ShipmentRepository();
