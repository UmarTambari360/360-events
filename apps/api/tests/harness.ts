import postgres from 'postgres';
import { databaseUrl } from '../src/config/database-url.js';

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
