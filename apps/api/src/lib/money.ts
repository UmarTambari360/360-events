export enum RoundingMode {
  HALF_UP = 'HALF_UP',
  DOWN = 'DOWN',
}

export class Money {
  public readonly kobo: bigint;
  public readonly currency = 'NGN';

  private constructor(kobo: bigint) {
    this.kobo = kobo;
  }

  /**
   * Constructs a Money instance from an API number or string.
   * Includes safe-integer guards preventing precision loss.
   */
  public static fromKobo(amount: number | string | bigint): Money {
    if (typeof amount === 'number') {
      if (!Number.isSafeInteger(amount)) {
        throw new Error('Amount is not a safe integer.');
      }
      return new Money(BigInt(amount));
    }
    
    if (typeof amount === 'string') {
      if (!/^-?\d+$/.test(amount)) {
        throw new Error('Amount must be a whole integer string.');
      }
      return new Money(BigInt(amount));
    }

    return new Money(amount);
  }

  public add(other: Money): Money {
    return new Money(this.kobo + other.kobo);
  }

  public subtract(other: Money): Money {
    return new Money(this.kobo - other.kobo);
  }

  public multiply(multiplier: number): Money {
    if (!Number.isSafeInteger(multiplier)) {
      throw new Error('Multiplier must be a safe integer.');
    }
    return new Money(this.kobo * BigInt(multiplier));
  }

  public compare(other: Money): 1 | 0 | -1 {
    if (this.kobo > other.kobo) return 1;
    if (this.kobo < other.kobo) return -1;
    return 0;
  }

  /**
   * Calculates a percentage using basis points with explicit integer arithmetic.
   */
  public percentage(basisPoints: number, mode: RoundingMode = RoundingMode.HALF_UP): Money {
    if (!Number.isSafeInteger(basisPoints)) {
      throw new Error('Basis points must be a safe integer.');
    }

    const bp = BigInt(basisPoints);
    const product = this.kobo * bp;
    const divisor = 10000n;
    
    let result = product / divisor;

    if (mode === RoundingMode.HALF_UP) {
      const remainder = product % divisor;
      const isNegative = product < 0n;
      const absoluteRemainder = isNegative ? -remainder : remainder;
      
      if (absoluteRemainder >= 5000n) {
        result += isNegative ? -1n : 1n;
      }
    }

    return new Money(result);
  }

  /**
   * Splits an amount into exact ratios without losing a single kobo.
   */
  public allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) return [];
    
    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    if (totalRatio === 0) {
      throw new Error('Total ratio must be greater than zero.');
    }

    let remainder = this.kobo;
    const results = ratios.map((ratio) => {
      const share = (this.kobo * BigInt(ratio)) / BigInt(totalRatio);
      remainder -= share;
      return share;
    });

    // Distribute remainder safely kobo by kobo
    for (let i = 0; i < remainder; i++) {
      results[i] = (results[i] as bigint) + 1n;
    }

    return results.map((val) => new Money(val));
  }
}