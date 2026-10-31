import 'dotenv/config';

/**
 * Shared database URL for the application, tests, and Drizzle CLI.
 * The default matches the PostgreSQL port published by docker-compose.yml.
 */
export const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5435/360events_dev';
