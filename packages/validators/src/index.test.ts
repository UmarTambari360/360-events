import { describe, it, expect } from 'vitest';
import { paginationSchema } from './index.js';

describe('Pagination Schema', () => {
  it('parses valid pagination parameters and sets defaults', () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.cursor).toBeUndefined();
  });

  it('rejects limits outside the 1-100 bounds', () => {
    const result = paginationSchema.safeParse({ limit: 150 });
    expect(result.success).toBe(false);
  });
});