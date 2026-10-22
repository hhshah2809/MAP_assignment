import { describe, it, expect } from 'vitest';
import {
  createShipmentSchema,
  updateShipmentStatusSchema,
  updateShipmentAssignmentSchema
} from '../../src/validators/shipment.validator';

describe('Shipment Validator Unit Tests', () => {
  const validShipmentInput = {
    orderId: '550e8400-e29b-41d4-a716-446655440000',
    carrierName: 'FastLogistics',
    origin: {
      address: '100 Industrial Pkwy',
      city: 'Seattle',
      state: 'WA',
      countryCode: 'US',
      latitude: 47.6062,
      longitude: -122.3321
    },
    destination: {
      address: '500 Commercial Way',
      city: 'Portland',
      state: 'OR',
      countryCode: 'US',
      latitude: 45.5152,
      longitude: -122.6784
    }
  };

  it('validates correct shipment creation payload', () => {
    const result = createShipmentSchema.safeParse(validShipmentInput);
    expect(result.success).toBe(true);
  });

  it('rejects invalid orderId', () => {
    const result = createShipmentSchema.safeParse({
      ...validShipmentInput,
      orderId: 'not-a-uuid'
    });
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range coordinates', () => {
    const result = createShipmentSchema.safeParse({
      ...validShipmentInput,
      origin: {
        ...validShipmentInput.origin,
        latitude: 95.0 // Invalid > 90
      }
    });
    expect(result.success).toBe(false);
  });

  it('validates status transitions', () => {
    expect(updateShipmentStatusSchema.safeParse({ status: 'IN_TRANSIT' }).success).toBe(true);
    expect(updateShipmentStatusSchema.safeParse({ status: 'INVALID_STATUS' }).success).toBe(false);
  });

  it('validates carrier assignment', () => {
    expect(
      updateShipmentAssignmentSchema.safeParse({
        carrierName: 'DHL Express',
        truckNumber: 'TRK-101',
        driverName: 'John Doe'
      }).success
    ).toBe(true);

    expect(
      updateShipmentAssignmentSchema.safeParse({
        carrierName: ''
      }).success
    ).toBe(false);
  });
});
