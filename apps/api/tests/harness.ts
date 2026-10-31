import postgres from 'postgres';
import { db, queryClient } from '../src/db/index.js';
import { databaseUrl } from '../src/config/database-url.js';

/**
 * Truncates all tables in the public schema to ensure isolation between tests.
 * Safely ignores the Drizzle migrations table.
 */
export const truncateAll = async (): Promise<void> => {
  const tables = await queryClient`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename != 'drizzle_migrations';
  `;

  if (tables.length > 0) {
    const tableNames = tables.map(t => `"public"."${t.tablename}"`).join(', ');
    await queryClient.unsafe(`TRUNCATE TABLE ${tableNames} CASCADE;`);
  }
};

/**
 * Opens N independent PostgreSQL connections to simulate parallel callers.
 * Crucial for testing SELECT ... FOR UPDATE SKIP LOCKED concurrency.
 */
export const openConcurrencyConnections = (count: number): postgres.Sql[] => {
  const connections: postgres.Sql[] = [];
  for (let i = 0; i < count; i++) {
    // max: 1 ensures each instance uses a distinct connection, bypassing the pool
    connections.push(postgres(databaseUrl, { max: 1 }));
  }
  return connections;
};

/**
 * Cleans up concurrent connections after tests.
 */
export const closeConcurrencyConnections = async (connections: postgres.Sql[]): Promise<void> => {
  await Promise.all(connections.map(conn => conn.end()));
};
