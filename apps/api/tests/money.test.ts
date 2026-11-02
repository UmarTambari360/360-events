import { describe, it, expect } from 'vitest';
import { Money, RoundingMode } from '../src/lib/money.js';

describe('Money Primitives (P2-T01)', () => {
  it('rejects floating-point numbers and unsafe integers', () => {
    expect(() => Money.fromKobo(10.5)).toThrow('Amount is not a safe integer.');
    expect(() => Money.fromKobo(Number.MAX_SAFE_INTEGER + 1)).toThrow('Amount is not a safe integer.');
    expect(() => Money.fromKobo('10.5')).toThrow('Amount must be a whole integer string.');
  });

  it('performs exact addition and subtraction', () => {
    const a = Money.fromKobo(5000);
    const b = Money.fromKobo(3000);
    expect(a.add(b).kobo).toBe(8000n);
    expect(a.subtract(b).kobo).toBe(2000n);
  });

  describe('Golden Vectors (BR §10.1)', () => {
    it('calculates 5% platform fee correctly with NGN 10,000 subtotal', () => {
      // ₦10,000 = 1,000,000 kobo[cite: 3]
      const ticketSubtotal = Money.fromKobo(1_000_000);
      
      // 5% fee = 500 basis points
      const platformFee = ticketSubtotal.percentage(500, RoundingMode.HALF_UP);
      
      // Total payable calculation[cite: 3]
      const totalPayable = ticketSubtotal.add(platformFee);

      expect(platformFee.kobo).toBe(50_000n); // ₦500
      expect(totalPayable.kobo).toBe(1_050_000n); // ₦10,500
    });
  });

  describe('Rounding Modes', () => {
    it('rounds HALF_UP on exactly .5 boundaries', () => {
      // 105 kobo * 5% (500 bps) = 5.25 kobo. Half-up should round down to 5.
      const base1 = Money.fromKobo(105);
      expect(base1.percentage(500, RoundingMode.HALF_UP).kobo).toBe(5n);

      // 110 kobo * 5% (500 bps) = 5.5 kobo. Half-up should round up to 6.
      const base2 = Money.fromKobo(110);
      expect(base2.percentage(500, RoundingMode.HALF_UP).kobo).toBe(6n);
    });

    it('truncates using DOWN rounding', () => {
      // 110 kobo * 5% = 5.5. Down should truncate to 5.
      const base = Money.fromKobo(110);
      expect(base.percentage(500, RoundingMode.DOWN).kobo).toBe(5n);
    });
  });

  describe('Property Tests: Allocation', () => {
    it('always sums exactly to the input amount without losing kobo', () => {
      const total = Money.fromKobo(100);
      // Split 100 kobo into 3 equal parts
      const allocated = total.allocate([1, 1, 1]);
      
      expect(allocated.length).toBe(3);
      expect(allocated[0]?.kobo).toBe(34n);
      expect(allocated[1]?.kobo).toBe(33n);
      expect(allocated[2]?.kobo).toBe(33n);

      // Verify preservation of sum
      const sum = allocated.reduce((acc, money) => acc + money.kobo, 0n);
      expect(sum).toBe(100n);
    });
  });
});