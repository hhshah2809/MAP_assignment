import { describe, it, expect } from 'vitest';
import {
  createOrderSchema,
  cancelOrderSchema,
  listOrdersQuerySchema
} from '../../src/validators/order.validator';

describe('Validation Schemas Unit Tests', () => {
  const validOrderPayload = {
    customerId: 'a9a6f5e4-1234-4567-8901-123456789012',
    customerReference: 'PO-2026-001',
    currencyCode: 'INR',
    origin: {
      addressLine1: 'Warehouse 1, GIDC',
      city: 'Anand',
      state: 'Gujarat',
      postalCode: '388001',
      countryCode: 'IN'
    },
    destination: {
      addressLine1: 'Distribution Centre',
      city: 'Ahmedabad',
      state: 'Gujarat',
      postalCode: '380001',
      countryCode: 'IN'
    },
    items: [
      {
        itemName: 'Industrial Components',
        sku: 'COMP-001',
        quantity: 10,
        unitOfMeasure: 'PCS',
        unitPrice: 150.0,
        weightKg: 25
      }
    ],
    taxAmount: 100,
    shippingAmount: 250,
    discountAmount: 50,
    notes: 'Handle carefully',
    requestedPickupAt: '2026-10-22T08:00:00.000Z',
    requestedDeliveryAt: '2026-10-23T16:00:00.000Z'
  };

  it('should accept valid order creation payload', () => {
    const result = createOrderSchema.safeParse(validOrderPayload);
    expect(result.success).toBe(true);
  });

  it('should reject malformed customerId UUID', () => {
    const result = createOrderSchema.safeParse({
      ...validOrderPayload,
      customerId: 'not-a-valid-uuid'
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid currencyCode and countryCode', () => {
    const badCurrency = createOrderSchema.safeParse({
      ...validOrderPayload,
      currencyCode: 'TOOLONG'
    });
    expect(badCurrency.success).toBe(false);

    const badCountry = createOrderSchema.safeParse({
      ...validOrderPayload,
      origin: { ...validOrderPayload.origin, countryCode: 'INDIA' }
    });
    expect(badCountry.success).toBe(false);
  });

  it('should reject empty items array', () => {
    const result = createOrderSchema.safeParse({
      ...validOrderPayload,
      items: []
    });
    expect(result.success).toBe(false);
  });

  it('should reject when requestedDeliveryAt is earlier than requestedPickupAt', () => {
    const result = createOrderSchema.safeParse({
      ...validOrderPayload,
      requestedPickupAt: '2026-10-23T10:00:00.000Z',
      requestedDeliveryAt: '2026-10-22T10:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });

  it('should reject cancellation reason exceeding 500 characters', () => {
    const tooLong = 'x'.repeat(501);
    const result = cancelOrderSchema.safeParse({ reason: tooLong });
    expect(result.success).toBe(false);

    const validReason = cancelOrderSchema.safeParse({ reason: 'Valid reason' });
    expect(validReason.success).toBe(true);
  });

  it('should parse and sanitize list orders query parameters', () => {
    const query = {
      page: '2',
      limit: '50',
      status: 'PENDING',
      sortBy: 'totalAmount',
      sortOrder: 'ASC'
    };
    const result = listOrdersQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
      expect(result.data.status).toBe('PENDING');
      expect(result.data.sortBy).toBe('totalAmount');
      expect(result.data.sortOrder).toBe('asc');
    }
  });
});
