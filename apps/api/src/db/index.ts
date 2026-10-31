import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/360events_dev';

// Application pool restricts max connections
export const queryClient = postgres(connectionString, { 
  max: 20, 
  idle_timeout: 30,
  connect_timeout: 10
});

export const db = drizzle(queryClient);

export const closeDatabase = async (): Promise<void> => {
  await queryClient.end({ timeout: 5 });
};