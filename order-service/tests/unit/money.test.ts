import { describe, it, expect } from 'vitest';
import { calculateLineTotal, calculateOrderTotals } from '../../src/utils/money';
import { ValidationError } from '../../src/utils/errors';

describe('Monetary Calculations Unit Tests (Decimal-safe)', () => {
  it('should calculate line total accurately without floating point precision errors', () => {
    // In standard JS floating point: 0.1 * 3 = 0.30000000000000004
    const total1 = calculateLineTotal(3, 0.1);
    expect(total1).toBe('0.30');

    // Complex fractional multiplication
    const total2 = calculateLineTotal(7.5, 19.99);
    expect(total2).toBe('149.93');
  });

  it('should calculate subtotal and total amount with tax, shipping, and discount', () => {
    const items = [
      { quantity: 2, unitPrice: 150.0 }, // 300.00
      { quantity: 3.5, unitPrice: 200.0 } // 700.00
    ];

    const result = calculateOrderTotals(items, 180.0, 50.0, 30.0);

    expect(result.calculatedLineTotals).toEqual(['300.00', '700.00']);
    expect(result.subtotal).toBe('1000.00');
    expect(result.taxAmount).toBe('180.00');
    expect(result.shippingAmount).toBe('50.00');
    expect(result.discountAmount).toBe('30.00');
    // 1000 + 180 + 50 - 30 = 1200.00
    expect(result.totalAmount).toBe('1200.00');
  });

  it('should reject quantity <= 0', () => {
    expect(() => calculateLineTotal(0, 100)).toThrow(ValidationError);
    expect(() => calculateLineTotal(-2, 100)).toThrow(ValidationError);
  });

  it('should reject negative unit price', () => {
    expect(() => calculateLineTotal(2, -5)).toThrow(ValidationError);
  });

  it('should reject negative tax, shipping, or discount', () => {
    const items = [{ quantity: 1, unitPrice: 100 }];
    expect(() => calculateOrderTotals(items, -10, 0, 0)).toThrow(ValidationError);
    expect(() => calculateOrderTotals(items, 0, -5, 0)).toThrow(ValidationError);
    expect(() => calculateOrderTotals(items, 0, 0, -20)).toThrow(ValidationError);
  });

  it('should reject discount that exceeds total before discount', () => {
    const items = [{ quantity: 1, unitPrice: 100 }]; // subtotal = 100
    // total before discount = 100 + 10 + 10 = 120
    expect(() => calculateOrderTotals(items, 10, 10, 120.01)).toThrow(ValidationError);
  });

  it('should allow discount equal to total before discount, resulting in total 0.00', () => {
    const items = [{ quantity: 1, unitPrice: 100 }];
    const result = calculateOrderTotals(items, 0, 0, 100);
    expect(result.totalAmount).toBe('0.00');
  });
});
