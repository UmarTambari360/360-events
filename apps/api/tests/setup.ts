   import { databaseUrl } from '../src/config/database-url.js';
    import postgres from 'postgres';

    export async function setup() {
      const sql = postgres(databaseUrl, { max: 1, connect_timeout: 3 });
      try {
        await sql`SELECT 1`;
      } catch {
        throw new Error(
          `[test setup] Cannot connect to Postgres at ${databaseUrl}.\n` +
          `Run 'docker compose up -d' from the project root first.`
        );
      } finally {
        await sql.end();
      }
    }
