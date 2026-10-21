import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';

const SEED_CUSTOMER_ID_1 = 'a9a6f5e4-1234-4567-8901-123456789012';
const SEED_CUSTOMER_ID_2 = 'b8b5e4d3-5678-4321-9012-987654321098';

const seedOrders = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    orderNumber: 'ORD-20261021-SEED001',
    customerId: SEED_CUSTOMER_ID_1,
    customerReference: 'PO-GLOBAL-2026-001',
    origin: {
      addressLine1: 'Plot 45, GIDC Industrial Estate',
      city: 'Anand',
      state: 'Gujarat',
      postalCode: '388001',
      countryCode: 'IN'
    },
    destination: {
      addressLine1: 'Warehouse Hub 3, Ring Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      postalCode: '380001',
      countryCode: 'IN'
    },
    currencyCode: 'INR',
    subtotal: '2500.00',
    taxAmount: '200.00',
    shippingAmount: '350.00',
    discountAmount: '50.00',
    totalAmount: '3000.00',
    status: 'PENDING',
    notes: 'Handle with care: industrial electrical components.',
    version: 1,
    items: [
      {
        id: '20000000-0000-4000-8000-000000000001',
        lineNumber: 1,
        itemName: 'Electric Motor 5HP',
        sku: 'MOT-5HP-01',
        description: 'Three-phase industrial induction motor',
        quantity: '2.000',
        unitOfMeasure: 'PCS',
        unitPrice: '1000.00',
        lineTotal: '2000.00',
        weightKg: '45.500',
        lengthCm: '60.00',
        widthCm: '40.00',
        heightCm: '40.00'
      },
      {
        id: '20000000-0000-4000-8000-000000000002',
        lineNumber: 2,
        itemName: 'Variable Frequency Drive',
        sku: 'VFD-INV-02',
        description: 'VFD controller unit for AC motor',
        quantity: '1.000',
        unitOfMeasure: 'PCS',
        unitPrice: '500.00',
        lineTotal: '500.00',
        weightKg: '5.000',
        lengthCm: '30.00',
        widthCm: '20.00',
        heightCm: '15.00'
      }
    ]
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    orderNumber: 'ORD-20261021-SEED002',
    customerId: SEED_CUSTOMER_ID_2,
    customerReference: 'PO-APEX-9988',
    origin: {
      addressLine1: 'Port Logistics Park, Berth 7',
      city: 'Mundra',
      state: 'Gujarat',
      postalCode: '370421',
      countryCode: 'IN'
    },
    destination: {
      addressLine1: 'Export Processing Zone, Sector 4',
      city: 'Gandhinagar',
      state: 'Gujarat',
      postalCode: '382010',
      countryCode: 'IN'
    },
    currencyCode: 'INR',
    subtotal: '12000.00',
    taxAmount: '1200.00',
    shippingAmount: '800.00',
    discountAmount: '0.00',
    totalAmount: '14000.00',
    status: 'CONFIRMED',
    notes: 'Temperature controlled cargo: 15-25C.',
    version: 2,
    items: [
      {
        id: '20000000-0000-4000-8000-000000000003',
        lineNumber: 1,
        itemName: 'Pharmaceutical Active Ingredients',
        sku: 'API-PHARMA-100',
        description: 'Bulk packed chemical compound drums',
        quantity: '12.000',
        unitOfMeasure: 'DRUM',
        unitPrice: '1000.00',
        lineTotal: '12000.00',
        weightKg: '600.000',
        lengthCm: '120.00',
        widthCm: '80.00',
        heightCm: '100.00'
      }
    ],
    history: [
      {
        id: '30000000-0000-4000-8000-000000000001',
        previousStatus: null,
        newStatus: 'PENDING',
        changedBy: SEED_CUSTOMER_ID_2,
        reason: 'Order created via portal',
        createdAt: '2026-10-21 10:00:00.000'
      },
      {
        id: '30000000-0000-4000-8000-000000000002',
        previousStatus: 'PENDING',
        newStatus: 'CONFIRMED',
        changedBy: 'ops-admin-01',
        reason: 'Order verified and commercial terms approved',
        createdAt: '2026-10-21 11:30:00.000'
      }
    ]
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    orderNumber: 'ORD-20261021-SEED003',
    customerId: SEED_CUSTOMER_ID_1,
    customerReference: 'PO-CANCEL-TEST',
    origin: {
      addressLine1: 'Warehouse 12, Transport Nagar',
      city: 'Vadodara',
      state: 'Gujarat',
      postalCode: '390001',
      countryCode: 'IN'
    },
    destination: {
      addressLine1: 'Retail Depot 5',
      city: 'Surat',
      state: 'Gujarat',
      postalCode: '395001',
      countryCode: 'IN'
    },
    currencyCode: 'INR',
    subtotal: '450.00',
    taxAmount: '45.00',
    shippingAmount: '50.00',
    discountAmount: '0.00',
    totalAmount: '545.00',
    status: 'CANCELLED',
    notes: 'Order cancelled due to duplicate submission by customer.',
    version: 2,
    items: [
      {
        id: '20000000-0000-4000-8000-000000000004',
        lineNumber: 1,
        itemName: 'Packaging Materials',
        sku: 'PKG-BOX-M',
        description: 'Corrugated cartons (medium)',
        quantity: '30.000',
        unitOfMeasure: 'PCS',
        unitPrice: '15.00',
        lineTotal: '450.00',
        weightKg: '15.000',
        lengthCm: '50.00',
        widthCm: '40.00',
        heightCm: '40.00'
      }
    ],
    history: [
      {
        id: '30000000-0000-4000-8000-000000000003',
        previousStatus: null,
        newStatus: 'PENDING',
        changedBy: SEED_CUSTOMER_ID_1,
        reason: 'Order created',
        createdAt: '2026-10-21 08:00:00.000'
      },
      {
        id: '30000000-0000-4000-8000-000000000004',
        previousStatus: 'PENDING',
        newStatus: 'CANCELLED',
        changedBy: SEED_CUSTOMER_ID_1,
        reason: 'Client requested cancellation: duplicate order submitted in error',
        createdAt: '2026-10-21 08:45:00.000'
      }
    ]
  }
];

export async function seedDatabase(): Promise<void> {
  const targetDb = env.NODE_ENV === 'test' ? env.DB_NAME_TEST : env.DB_NAME;
  logger.info({ targetDb }, 'Starting database seeding...');

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: targetDb,
    timezone: 'Z'
  });

  try {
    let insertedOrders = 0;

    for (const seed of seedOrders) {
      // Check if seed order already exists
      const [existing] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT id FROM orders WHERE order_number = ?',
        [seed.orderNumber]
      );

      if (existing.length > 0) {
        logger.info({ orderNumber: seed.orderNumber }, 'Seed order already exists; skipping.');
        continue;
      }

      await connection.beginTransaction();

      try {
        // Insert order
        await connection.query(
          `INSERT INTO orders (
            id, order_number, customer_id, customer_reference,
            origin_address_line1, origin_city, origin_state, origin_postal_code, origin_country_code,
            destination_address_line1, destination_city, destination_state, destination_postal_code, destination_country_code,
            currency_code, subtotal, tax_amount, shipping_amount, discount_amount, total_amount,
            status, notes, created_at, updated_at, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), ?)`,
          [
            seed.id,
            seed.orderNumber,
            seed.customerId,
            seed.customerReference,
            seed.origin.addressLine1,
            seed.origin.city,
            seed.origin.state,
            seed.origin.postalCode,
            seed.origin.countryCode,
            seed.destination.addressLine1,
            seed.destination.city,
            seed.destination.state,
            seed.destination.postalCode,
            seed.destination.countryCode,
            seed.currencyCode,
            seed.subtotal,
            seed.taxAmount,
            seed.shippingAmount,
            seed.discountAmount,
            seed.totalAmount,
            seed.status,
            seed.notes,
            seed.version
          ]
        );

        // Insert items
        for (const item of seed.items) {
          await connection.query(
            `INSERT INTO order_items (
              id, order_id, line_number, item_name, sku, description,
              quantity, unit_of_measure, unit_price, line_total,
              weight_kg, length_cm, width_cm, height_cm,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
            [
              item.id,
              seed.id,
              item.lineNumber,
              item.itemName,
              item.sku,
              item.description,
              item.quantity,
              item.unitOfMeasure,
              item.unitPrice,
              item.lineTotal,
              item.weightKg,
              item.lengthCm,
              item.widthCm,
              item.heightCm
            ]
          );
        }

        // Insert history
        const histories = seed.history || [
          {
            id: uuidv4(),
            previousStatus: null,
            newStatus: seed.status,
            changedBy: seed.customerId,
            reason: 'Order created',
            createdAt: '2026-10-21 09:00:00.000'
          }
        ];

        for (const hist of histories) {
          await connection.query(
            `INSERT INTO order_status_history (
              id, order_id, previous_status, new_status, changed_by, reason, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [hist.id, seed.id, hist.previousStatus, hist.newStatus, hist.changedBy, hist.reason, hist.createdAt]
          );
        }

        // Insert outbox event
        await connection.query(
          `INSERT INTO outbox_events (
            id, aggregate_type, aggregate_id, event_type, event_version, payload, status, created_at
          ) VALUES (?, 'Order', ?, ?, 1, ?, 'PENDING', UTC_TIMESTAMP(3))`,
          [
            uuidv4(),
            seed.id,
            `order.${seed.status.toLowerCase()}.v1`,
            JSON.stringify({
              orderId: seed.id,
              orderNumber: seed.orderNumber,
              customerId: seed.customerId,
              totalAmount: seed.totalAmount,
              status: seed.status
            })
          ]
        );

        await connection.commit();
        insertedOrders++;
        logger.info({ orderNumber: seed.orderNumber }, 'Successfully inserted seed order.');
      } catch (err) {
        await connection.rollback();
        throw err;
      }
    }

    logger.info({ insertedOrders }, 'Seeding completed.');
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('✅ Seeding finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('❌ Seeding error:', err);
      process.exit(1);
    });
}
