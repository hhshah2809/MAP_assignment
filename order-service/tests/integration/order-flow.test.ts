import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import mysql, { RowDataPacket } from 'mysql2/promise';
import { app } from '../../src/app';
import { env } from '../../src/config/env';
import { runMigrations } from '../../scripts/migrate';
import { closePool, getDatabasePool } from '../../src/config/database';

describe('Order Service Integration Tests (Full HTTP & DB Flow)', () => {
  const testDbName = env.DB_NAME_TEST;
  let testPool: mysql.Pool;

  beforeAll(async () => {
    // 1. Ensure migrations are applied on isolated test database
    await runMigrations({ database: testDbName, silent: true });

    // 2. Initialize test database connection pool
    testPool = getDatabasePool({ database: testDbName });

    // 3. Clear tables in test database to have a clean slate
    const conn = await testPool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('TRUNCATE TABLE order_items');
      await conn.query('TRUNCATE TABLE order_status_history');
      await conn.query('TRUNCATE TABLE outbox_events');
      await conn.query('TRUNCATE TABLE idempotency_keys');
      await conn.query('TRUNCATE TABLE orders');
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }
  });

  afterAll(async () => {
    await closePool();
  });

  // Test Payload
  const customerId = uuidv4();
  const sampleOrderPayload = {
    customerId,
    customerReference: 'PO-TEST-001',
    currencyCode: 'INR',
    origin: {
      addressLine1: 'Warehouse 1, GIDC',
      city: 'Anand',
      state: 'Gujarat',
      postalCode: '388001',
      countryCode: 'IN'
    },
    destination: {
      addressLine1: 'Distribution Hub 4',
      city: 'Ahmedabad',
      state: 'Gujarat',
      postalCode: '380001',
      countryCode: 'IN'
    },
    items: [
      {
        itemName: 'Industrial Precision Sensor',
        sku: 'SNS-001',
        description: 'Temperature and vibration sensor unit',
        quantity: 5,
        unitOfMeasure: 'PCS',
        unitPrice: 200.0,
        weightKg: 2.5
      },
      {
        itemName: 'Mounting Bracket',
        sku: 'BRK-002',
        description: 'Stainless steel mounting hardware',
        quantity: 10,
        unitOfMeasure: 'PCS',
        unitPrice: 50.0,
        weightKg: 1.0
      }
    ],
    taxAmount: 150.0,
    shippingAmount: 100.0,
    discountAmount: 50.0,
    notes: 'Fragile electronics. Handle with extreme care.',
    requestedPickupAt: '2026-10-25T09:00:00.000Z',
    requestedDeliveryAt: '2026-10-26T18:00:00.000Z'
  };

  let createdOrderId: string;
  let createdOrderNumber: string;
  const initialIdempotencyKey = `idem-${uuidv4()}`;

  describe('1. Health and Readiness Endpoints', () => {
    it('GET /health should return 200 with UP status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UP');
      expect(res.body.data.service).toBe('order-service');
    });

    it('GET /ready should return 200 with database CONNECTED', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('READY');
      expect(res.body.data.checks.database).toBe('CONNECTED');
    });
  });

  describe('2. Order Creation & Idempotency', () => {
    it('POST /api/v1/orders should fail when Idempotency-Key header is missing', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send(sampleOrderPayload);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/orders should create order and calculate exact totals (201 Created)', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Idempotency-Key', initialIdempotencyKey)
        .send(sampleOrderPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const order = res.body.data;
      expect(order.id).toBeDefined();
      expect(order.orderNumber).toMatch(/^ORD-\d{8}-[0-9A-F]{8}$/);
      expect(order.status).toBe('PENDING');
      expect(order.currencyCode).toBe('INR');

      // Subtotal = (5 * 200) + (10 * 50) = 1000 + 500 = 1500.00
      expect(order.subtotal).toBe('1500.00');
      expect(order.taxAmount).toBe('150.00');
      expect(order.shippingAmount).toBe('100.00');
      expect(order.discountAmount).toBe('50.00');
      // Total = 1500 + 150 + 100 - 50 = 1700.00
      expect(order.totalAmount).toBe('1700.00');
      expect(order.items).toHaveLength(2);

      createdOrderId = order.id;
      createdOrderNumber = order.orderNumber;

      // Verify DB persistence of order, items, history, outbox
      const [orderRows] = await testPool.query<RowDataPacket[]>(
        'SELECT * FROM orders WHERE id = ?',
        [createdOrderId]
      );
      expect(orderRows).toHaveLength(1);

      const [itemRows] = await testPool.query<RowDataPacket[]>(
        'SELECT * FROM order_items WHERE order_id = ?',
        [createdOrderId]
      );
      expect(itemRows).toHaveLength(2);

      const [historyRows] = await testPool.query<RowDataPacket[]>(
        'SELECT * FROM order_status_history WHERE order_id = ?',
        [createdOrderId]
      );
      expect(historyRows).toHaveLength(1);
      expect(historyRows[0].new_status).toBe('PENDING');

      const [outboxRows] = await testPool.query<RowDataPacket[]>(
        'SELECT * FROM outbox_events WHERE aggregate_id = ?',
        [createdOrderId]
      );
      expect(outboxRows).toHaveLength(1);
      expect(outboxRows[0].event_type).toBe('order.created.v1');
    });

    it('POST /api/v1/orders should replay identical response on duplicate Idempotency-Key', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Idempotency-Key', initialIdempotencyKey)
        .send(sampleOrderPayload);

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdOrderId);

      // Verify no duplicate order was inserted into the database
      const [orderRows] = await testPool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as cnt FROM orders'
      );
      expect(Number(orderRows[0].cnt)).toBe(1);
    });

    it('POST /api/v1/orders should reject duplicate Idempotency-Key with different payload (409 Conflict)', async () => {
      const conflictPayload = {
        ...sampleOrderPayload,
        customerReference: 'PO-DIFFERENT-REFERENCE'
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Idempotency-Key', initialIdempotencyKey)
        .send(conflictPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
    });
  });

  describe('3. Order Retrieval & Listing', () => {
    it('GET /api/v1/orders/:id should return created order with items', async () => {
      const res = await request(app).get(`/api/v1/orders/${createdOrderId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdOrderId);
      expect(res.body.data.items).toHaveLength(2);
    });

    it('GET /api/v1/orders/:id should return 404 for unknown order ID', async () => {
      const nonExistentId = uuidv4();
      const res = await request(app).get(`/api/v1/orders/${nonExistentId}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('GET /api/v1/orders/number/:orderNumber should return order by human-readable number', async () => {
      const res = await request(app).get(`/api/v1/orders/number/${createdOrderNumber}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdOrderId);
      expect(res.body.data.orderNumber).toBe(createdOrderNumber);
    });

    it('GET /api/v1/orders should list and paginate orders', async () => {
      const res = await request(app).get('/api/v1/orders?page=1&limit=10&status=PENDING');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.pagination).toBeDefined();
      expect(res.body.meta.pagination.page).toBe(1);
      expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. Permitted Updates & Optimistic Concurrency', () => {
    it('PATCH /api/v1/orders/:id should update permitted fields (notes, customerReference)', async () => {
      const res = await request(app)
        .patch(`/api/v1/orders/${createdOrderId}`)
        .send({
          customerReference: 'PO-UPDATED-001',
          notes: 'Updated special handling instructions: deliver via dock 3.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.customerReference).toBe('PO-UPDATED-001');
      expect(res.body.data.notes).toBe('Updated special handling instructions: deliver via dock 3.');
      expect(res.body.data.version).toBe(2);
    });

    it('PATCH /api/v1/orders/:id should reject stale version (409 Conflict)', async () => {
      const res = await request(app)
        .patch(`/api/v1/orders/${createdOrderId}`)
        .send({
          version: 1, // Stale version! (Current version is 2)
          notes: 'Stale update attempt'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('STALE_ORDER_VERSION');
    });
  });

  describe('5. Order Lifecycle Transitions', () => {
    it('POST /api/v1/orders/:id/confirm should transition PENDING -> CONFIRMED and record outbox event', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${createdOrderId}/confirm`)
        .set('X-Actor-Id', 'ops-user-123');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');

      // Verify outbox event order.confirmed.v1 was inserted
      const [outboxRows] = await testPool.query<RowDataPacket[]>(
        'SELECT * FROM outbox_events WHERE aggregate_id = ? AND event_type = ?',
        [createdOrderId, 'order.confirmed.v1']
      );
      expect(outboxRows).toHaveLength(1);

      // Verify status history
      const [historyRows] = await testPool.query<RowDataPacket[]>(
        'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC',
        [createdOrderId]
      );
      expect(historyRows).toHaveLength(2);
      expect(historyRows[1].previous_status).toBe('PENDING');
      expect(historyRows[1].new_status).toBe('CONFIRMED');
      expect(historyRows[1].changed_by).toBe('ops-user-123');
    });

    it('POST /api/v1/orders/:id/confirm should reject re-confirming already CONFIRMED order (409 Conflict)', async () => {
      const res = await request(app).post(`/api/v1/orders/${createdOrderId}/confirm`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ORDER_STATE_CONFLICT');
    });

    it('POST /api/v1/orders/:id/cancel should cancel CONFIRMED order with reason', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${createdOrderId}/cancel`)
        .send({ reason: 'Customer requested cancellation prior to shipment dispatch.' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');

      // Verify outbox event order.cancelled.v1
      const [outboxRows] = await testPool.query<RowDataPacket[]>(
        'SELECT * FROM outbox_events WHERE aggregate_id = ? AND event_type = ?',
        [createdOrderId, 'order.cancelled.v1']
      );
      expect(outboxRows).toHaveLength(1);
    });

    it('POST /api/v1/orders/:id/cancel should reject cancellation on already CANCELLED order (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${createdOrderId}/cancel`)
        .send({ reason: 'Duplicate cancellation' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ORDER_STATE_CONFLICT');
    });

    it('GET /api/v1/orders/:id/history should return complete transition history in order', async () => {
      const res = await request(app).get(`/api/v1/orders/${createdOrderId}/history`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].newStatus).toBe('PENDING');
      expect(res.body.data[1].newStatus).toBe('CONFIRMED');
      expect(res.body.data[2].newStatus).toBe('CANCELLED');
    });
  });
});
