import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { closeDatabase } from './db/index.js';

const app = buildApp();
const server = app.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');
  
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error during server closure');
      process.exit(1);
    }
    
    logger.info('HTTP server closed, closing database connections');
    try {
      await closeDatabase();
      logger.info('Database connections closed cleanly');
      process.exit(0);
    } catch (dbErr) {
      logger.error({ err: dbErr }, 'Error closing database connections');
      process.exit(1);
    }
  });

  // Force shutdown if graceful shutdown takes too long
  setTimeout(() => {
    logger.fatal('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));