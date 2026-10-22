import { describe, it, expect } from 'vitest';
import { canonicalizeJson, computeSha256 } from '../../src/utils/hash';

describe('Idempotency Hashing Unit Tests', () => {
  it('should generate identical canonical JSON regardless of object key order', () => {
    const objA = { b: 2, a: 1, c: { z: 26, y: 25 } };
    const objB = { c: { y: 25, z: 26 }, a: 1, b: 2 };

    const canonicalA = canonicalizeJson(objA);
    const canonicalB = canonicalizeJson(objB);

    expect(canonicalA).toBe(canonicalB);
    expect(computeSha256(canonicalA)).toBe(computeSha256(canonicalB));
  });

  it('should generate different hashes for different payloads', () => {
    const objA = { customerId: '11111111-1111-1111-1111-111111111111', quantity: 10 };
    const objB = { customerId: '11111111-1111-1111-1111-111111111111', quantity: 20 };

    expect(computeSha256(canonicalizeJson(objA))).not.toBe(
      computeSha256(canonicalizeJson(objB))
    );
  });
});
