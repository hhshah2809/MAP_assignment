import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getDatabasePool } from '../config/database';
import { Order, OrderItem, OrderStatus, OrderStatusHistory } from '../types/order.types';
import { PaginationParams } from '../utils/pagination';

export interface ListOrdersFilter {
  status?: OrderStatus;
  customerId?: string;
  orderNumber?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: 'createdAt' | 'totalAmount' | 'orderNumber' | 'status';
  sortOrder?: 'asc' | 'desc';
}

function mapRowToOrder(row: RowDataPacket): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    customerReference: row.customer_reference,
    origin: {
      addressLine1: row.origin_address_line1,
      addressLine2: row.origin_address_line2,
      city: row.origin_city,
      state: row.origin_state,
      postalCode: row.origin_postal_code,
      countryCode: row.origin_country_code
    },
    destination: {
      addressLine1: row.destination_address_line1,
      addressLine2: row.destination_address_line2,
      city: row.destination_city,
      state: row.destination_state,
      postalCode: row.destination_postal_code,
      countryCode: row.destination_country_code
    },
    currencyCode: row.currency_code,
    subtotal: String(row.subtotal),
    taxAmount: String(row.tax_amount),
    shippingAmount: String(row.shipping_amount),
    discountAmount: String(row.discount_amount),
    totalAmount: String(row.total_amount),
    status: row.status,
    notes: row.notes,
    requestedPickupAt: row.requested_pickup_at,
    requestedDeliveryAt: row.requested_delivery_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: Number(row.version)
  };
}

function mapRowToOrderItem(row: RowDataPacket): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    lineNumber: Number(row.line_number),
    itemName: row.item_name,
    sku: row.sku,
    description: row.description,
    quantity: String(row.quantity),
    unitOfMeasure: row.unit_of_measure,
    unitPrice: String(row.unit_price),
    lineTotal: String(row.line_total),
    weightKg: row.weight_kg !== null ? String(row.weight_kg) : null,
    lengthCm: row.length_cm !== null ? String(row.length_cm) : null,
    widthCm: row.width_cm !== null ? String(row.width_cm) : null,
    heightCm: row.height_cm !== null ? String(row.height_cm) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRowToHistory(row: RowDataPacket): OrderStatusHistory {
  return {
    id: row.id,
    orderId: row.order_id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    changedBy: row.changed_by,
    reason: row.reason,
    createdAt: row.created_at
  };
}

export class OrderRepository {
  async createOrder(order: Order, conn: PoolConnection): Promise<void> {
    await conn.query(
      `INSERT INTO orders (
        id, order_number, customer_id, customer_reference,
        origin_address_line1, origin_address_line2, origin_city, origin_state, origin_postal_code, origin_country_code,
        destination_address_line1, destination_address_line2, destination_city, destination_state, destination_postal_code, destination_country_code,
        currency_code, subtotal, tax_amount, shipping_amount, discount_amount, total_amount,
        status, notes, requested_pickup_at, requested_delivery_at,
        created_at, updated_at, version
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), ?
      )`,
      [
        order.id,
        order.orderNumber,
        order.customerId,
        order.customerReference || null,
        order.origin.addressLine1,
        order.origin.addressLine2 || null,
        order.origin.city,
        order.origin.state || null,
        order.origin.postalCode || null,
        order.origin.countryCode,
        order.destination.addressLine1,
        order.destination.addressLine2 || null,
        order.destination.city,
        order.destination.state || null,
        order.destination.postalCode || null,
        order.destination.countryCode,
        order.currencyCode,
        order.subtotal,
        order.taxAmount,
        order.shippingAmount,
        order.discountAmount,
        order.totalAmount,
        order.status,
        order.notes || null,
        order.requestedPickupAt ? new Date(order.requestedPickupAt) : null,
        order.requestedDeliveryAt ? new Date(order.requestedDeliveryAt) : null,
        order.version || 1
      ]
    );
  }

  async createOrderItems(items: OrderItem[], conn: PoolConnection): Promise<void> {
    if (items.length === 0) return;

    const values = items.map((item) => [
      item.id,
      item.orderId,
      item.lineNumber,
      item.itemName,
      item.sku || null,
      item.description || null,
      item.quantity,
      item.unitOfMeasure,
      item.unitPrice,
      item.lineTotal,
      item.weightKg || null,
      item.lengthCm || null,
      item.widthCm || null,
      item.heightCm || null
    ]);

    await conn.query(
      `INSERT INTO order_items (
        id, order_id, line_number, item_name, sku, description,
        quantity, unit_of_measure, unit_price, line_total,
        weight_kg, length_cm, width_cm, height_cm,
        created_at, updated_at
      ) VALUES ${items.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))').join(', ')}`,
      values.flat()
    );
  }

  async addStatusHistory(history: OrderStatusHistory, conn: PoolConnection): Promise<void> {
    await conn.query(
      `INSERT INTO order_status_history (
        id, order_id, previous_status, new_status, changed_by, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
      [
        history.id,
        history.orderId,
        history.previousStatus || null,
        history.newStatus,
        history.changedBy || null,
        history.reason || null
      ]
    );
  }

  async findById(id: string, conn?: PoolConnection): Promise<Order | null> {
    const executor = conn || getDatabasePool();
    const [rows] = await executor.query<RowDataPacket[]>(
      `SELECT * FROM orders WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return mapRowToOrder(rows[0]);
  }

  async findByOrderNumber(orderNumber: string, conn?: PoolConnection): Promise<Order | null> {
    const executor = conn || getDatabasePool();
    const [rows] = await executor.query<RowDataPacket[]>(
      `SELECT * FROM orders WHERE order_number = ?`,
      [orderNumber]
    );

    if (rows.length === 0) return null;
    return mapRowToOrder(rows[0]);
  }

  async findItemsByOrderId(orderId: string, conn?: PoolConnection): Promise<OrderItem[]> {
    const executor = conn || getDatabasePool();
    const [rows] = await executor.query<RowDataPacket[]>(
      `SELECT * FROM order_items WHERE order_id = ? ORDER BY line_number ASC`,
      [orderId]
    );

    return rows.map(mapRowToOrderItem);
  }

  async findHistoryByOrderId(orderId: string, conn?: PoolConnection): Promise<OrderStatusHistory[]> {
    const executor = conn || getDatabasePool();
    const [rows] = await executor.query<RowDataPacket[]>(
      `SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC`,
      [orderId]
    );

    return rows.map(mapRowToHistory);
  }

  async listOrders(
    filters: ListOrdersFilter,
    pagination: PaginationParams,
    conn?: PoolConnection
  ): Promise<{ orders: Order[]; total: number }> {
    const executor = conn || getDatabasePool();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.customerId) {
      conditions.push('customer_id = ?');
      params.push(filters.customerId);
    }
    if (filters.orderNumber) {
      conditions.push('order_number LIKE ?');
      params.push(`%${filters.orderNumber}%`);
    }
    if (filters.createdFrom) {
      conditions.push('created_at >= ?');
      params.push(new Date(filters.createdFrom));
    }
    if (filters.createdTo) {
      conditions.push('created_at <= ?');
      params.push(new Date(filters.createdTo));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Whitelisted sort column
    const sortColumnMap: Record<string, string> = {
      createdAt: 'created_at',
      totalAmount: 'total_amount',
      orderNumber: 'order_number',
      status: 'status'
    };
    const sortColumn = sortColumnMap[filters.sortBy || 'createdAt'] || 'created_at';
    const sortOrder = filters.sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Count total
    const [countRows] = await executor.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM orders ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    // Fetch records
    const [orderRows] = await executor.query<RowDataPacket[]>(
      `SELECT * FROM orders ${whereClause} ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`,
      [...params, pagination.limit, pagination.offset]
    );

    const orders = orderRows.map(mapRowToOrder);
    return { orders, total };
  }

  async updatePermittedFields(
    id: string,
    expectedVersion: number | undefined,
    fields: {
      customerReference?: string | null;
      origin?: Order['origin'];
      destination?: Order['destination'];
      notes?: string | null;
      requestedPickupAt?: string | null;
      requestedDeliveryAt?: string | null;
    },
    conn: PoolConnection
  ): Promise<{ updated: boolean; currentVersion: number }> {
    const sets: string[] = ['updated_at = UTC_TIMESTAMP(3)', 'version = version + 1'];
    const params: any[] = [];

    if (fields.customerReference !== undefined) {
      sets.push('customer_reference = ?');
      params.push(fields.customerReference);
    }
    if (fields.origin) {
      sets.push('origin_address_line1 = ?', 'origin_address_line2 = ?', 'origin_city = ?', 'origin_state = ?', 'origin_postal_code = ?', 'origin_country_code = ?');
      params.push(
        fields.origin.addressLine1,
        fields.origin.addressLine2 || null,
        fields.origin.city,
        fields.origin.state || null,
        fields.origin.postalCode || null,
        fields.origin.countryCode
      );
    }
    if (fields.destination) {
      sets.push('destination_address_line1 = ?', 'destination_address_line2 = ?', 'destination_city = ?', 'destination_state = ?', 'destination_postal_code = ?', 'destination_country_code = ?');
      params.push(
        fields.destination.addressLine1,
        fields.destination.addressLine2 || null,
        fields.destination.city,
        fields.destination.state || null,
        fields.destination.postalCode || null,
        fields.destination.countryCode
      );
    }
    if (fields.notes !== undefined) {
      sets.push('notes = ?');
      params.push(fields.notes);
    }
    if (fields.requestedPickupAt !== undefined) {
      sets.push('requested_pickup_at = ?');
      params.push(fields.requestedPickupAt ? new Date(fields.requestedPickupAt) : null);
    }
    if (fields.requestedDeliveryAt !== undefined) {
      sets.push('requested_delivery_at = ?');
      params.push(fields.requestedDeliveryAt ? new Date(fields.requestedDeliveryAt) : null);
    }

    let sql = `UPDATE orders SET ${sets.join(', ')} WHERE id = ?`;
    params.push(id);

    if (expectedVersion !== undefined) {
      sql += ' AND version = ?';
      params.push(expectedVersion);
    }

    const [result] = await conn.query<ResultSetHeader>(sql, params);

    // Fetch the current version after attempt
    const [checkRows] = await conn.query<RowDataPacket[]>(
      `SELECT version FROM orders WHERE id = ?`,
      [id]
    );

    const currentVersion = checkRows.length > 0 ? Number(checkRows[0].version) : 0;
    return {
      updated: result.affectedRows > 0,
      currentVersion
    };
  }

  async updateStatus(
    id: string,
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
    conn: PoolConnection
  ): Promise<{ updated: boolean; newVersion: number }> {
    const [result] = await conn.query<ResultSetHeader>(
      `UPDATE orders
       SET status = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND status = ?`,
      [newStatus, id, currentStatus]
    );

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT version FROM orders WHERE id = ?`,
      [id]
    );

    const newVersion = rows.length > 0 ? Number(rows[0].version) : 0;
    return {
      updated: result.affectedRows > 0,
      newVersion
    };
  }
}

export const orderRepository = new OrderRepository();
