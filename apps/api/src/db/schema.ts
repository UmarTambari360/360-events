import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// ADR-023: UUIDv7 primary keys
// We establish a dummy configuration table here strictly to generate the first migration 
// which verifies Drizzle drift and generation capabilities.
export const dbMigrations = pgTable('db_migrations_history', {
  id: text('id').primaryKey(), // Will store UUIDv7
  appliedAt: timestamp('applied_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});