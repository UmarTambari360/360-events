import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import type postgres from 'postgres';
import { queryClient } from '../src/db/index.js';
import { openConcurrencyConnections, closeConcurrencyConnections } from './harness.js';
import { 
  assertCanTransition, 
  executeTransition, 
  InvalidTransitionError, 
  type TransitionTable 
} from '../src/lib/transitions.js';

// Define a test-only schema for the integration fixture
const testEntities = pgTable('test_entities', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
});

const testHistory = pgTable('test_history', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull(),
  status: text('status').notNull(),
});

type OrderStatus = 'pending' | 'confirmed' | 'cancelled';

const orderTransitions: TransitionTable<OrderStatus> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: [],
  cancelled: [],
};
const fixtureEntityId = randomUUID();

describe('State Transitions (P2-T02)', () => {
  describe('Transition Table Logic', () => {
    it('allows valid transitions', () => {
      expect(() => assertCanTransition(orderTransitions, 'pending', 'confirmed')).not.toThrow();
      expect(() => assertCanTransition(orderTransitions, 'pending', 'cancelled')).not.toThrow();
    });

    it('rejects invalid transitions with a structured error', () => {
      expect(() => assertCanTransition(orderTransitions, 'confirmed', 'pending', 'Order'))
        .toThrow(InvalidTransitionError);
      
      try {
        assertCanTransition(orderTransitions, 'confirmed', 'pending', 'Order');
      } catch (err: unknown) {
        expect(err instanceof InvalidTransitionError).toBe(true);
        if (err instanceof InvalidTransitionError) {
          expect(err.code).toBe('INVALID_TRANSITION');
          expect(err.message).toBe("Cannot transition Order from 'confirmed' to 'pending'");
        }
      }
    });
  });

  describe('Database Conditional Updates & History [INV-10]', () => {
    let concurrentConns: postgres.Sql[] = [];

    beforeAll(async () => {
      await queryClient.unsafe(`
        CREATE TABLE IF NOT EXISTS test_entities (id text PRIMARY KEY, status text NOT NULL);
        CREATE TABLE IF NOT EXISTS test_history (id text PRIMARY KEY, entity_id text NOT NULL, status text NOT NULL);
      `);
      concurrentConns = openConcurrencyConnections(10);
    });

    afterAll(async () => {
      await closeConcurrencyConnections(concurrentConns);
      await queryClient`DELETE FROM test_history WHERE entity_id = ${fixtureEntityId}`;
      await queryClient`DELETE FROM test_entities WHERE id = ${fixtureEntityId}`;
    });

    it('safely handles concurrent transition attempts, ensuring exactly one caller wins', async () => {
      const entityId = fixtureEntityId;

      await queryClient`INSERT INTO test_entities (id, status) VALUES (${entityId}, 'pending')`;

      const results = await Promise.all(concurrentConns.map(async (conn, index) => {
        const isolatedDb = drizzle(conn);
        return await isolatedDb.transaction(async (tx) => {
          return executeTransition(tx as Parameters<typeof executeTransition>[0], {
            table: testEntities,
            idColumn: testEntities.id,
            statusColumn: testEntities.status,
            entityId,
            fromStatus: 'pending',
            updatePayload: { status: 'confirmed' },
            historyTable: testHistory,
            // Replaced the 'any' parameter with Drizzle's strict $inferSelect generic
            buildHistoryRecord: (entity: typeof testEntities.$inferSelect) => ({
              id: `history-${entityId}-${index}`,
              entityId: entity.id,
              status: entity.status,
            }),
          });
        });
      }));

      const successfulTransitions = results.filter((r) => r.success === true);
      const failedTransitions = results.filter((r) => r.success === false);

      expect(successfulTransitions.length).toBe(1);
      expect(successfulTransitions[0]?.data?.status).toBe('confirmed');
      
      expect(failedTransitions.length).toBe(9);
      failedTransitions.forEach(fail => expect(fail.data).toBeNull());

      const historyRows = await queryClient`SELECT * FROM test_history WHERE entity_id = ${entityId}`;
      expect(historyRows.length).toBe(1);
      expect(historyRows[0]?.status).toBe('confirmed');
    });
  });
});
