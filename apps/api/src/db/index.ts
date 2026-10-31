import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { databaseUrl } from '../config/database-url.js';

// Application pool restricts max connections
export const queryClient = postgres(databaseUrl, {
  max: 20, 
  idle_timeout: 30,
  connect_timeout: 10
});

export const db = drizzle(queryClient);

export const closeDatabase = async (): Promise<void> => {
  await queryClient.end({ timeout: 5 });
};
