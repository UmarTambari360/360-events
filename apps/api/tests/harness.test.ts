import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { openConcurrencyConnections, closeConcurrencyConnections } from './harness.js';
import type postgres from 'postgres';

describe('Concurrency Test Harness', () => {
  let concurrentConns: postgres.Sql[];

  beforeAll(() => {
    concurrentConns = openConcurrencyConnections(2);
  });

  afterAll(async () => {
    await closeConcurrencyConnections(concurrentConns);
  });

  it('proves independent connections can be spawned for concurrency scenarios', async () => {
    expect(concurrentConns).toHaveLength(2);
    
    const [conn1, conn2] = concurrentConns;
    
    // Simple proof of independent execution 
    const res1 = await conn1`SELECT 1 as val`;
    const res2 = await conn2`SELECT 2 as val`;
    
    expect(res1[0]?.val).toBe(1);
    expect(res2[0]?.val).toBe(2);
  });
});