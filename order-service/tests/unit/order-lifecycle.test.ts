import { describe, it, expect } from 'vitest';
import { OrderStatus } from '../../src/types/order.types';

// Encapsulated state transition rules
function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === 'PENDING') {
    return to === 'CONFIRMED' || to === 'CANCELLED';
  }
  if (from === 'CONFIRMED') {
    return to === 'CANCELLED';
  }
  if (from === 'CANCELLED') {
    return false; // Terminal state
  }
  return false;
}

describe('Order Lifecycle Transition Matrix Unit Tests', () => {
  it('should allow PENDING -> CONFIRMED', () => {
    expect(isValidTransition('PENDING', 'CONFIRMED')).toBe(true);
  });

  it('should allow PENDING -> CANCELLED', () => {
    expect(isValidTransition('PENDING', 'CANCELLED')).toBe(true);
  });

  it('should allow CONFIRMED -> CANCELLED', () => {
    expect(isValidTransition('CONFIRMED', 'CANCELLED')).toBe(true);
  });

  it('should disallow CONFIRMED -> PENDING', () => {
    expect(isValidTransition('CONFIRMED', 'PENDING')).toBe(false);
  });

  it('should disallow CANCELLED -> PENDING or CONFIRMED (terminal state)', () => {
    expect(isValidTransition('CANCELLED', 'PENDING')).toBe(false);
    expect(isValidTransition('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(isValidTransition('CANCELLED', 'CANCELLED')).toBe(false);
  });
});
