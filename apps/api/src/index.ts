import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { closeDatabase } from './db/index.js';

const app = buildApp();
const server = app.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

const closeHttpServer = (): Promise<void> => new Promise((resolve, reject) => {
  server.close((err) => {
    if (err) {
      reject(err);
      return;
    }

    resolve();
  });
});

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

  // Force shutdown if graceful shutdown takes too long.
  const shutdownTimeout = setTimeout(() => {
    logger.fatal('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
  shutdownTimeout.unref();

  try {
    await closeHttpServer();
    logger.info('HTTP server closed, closing database connections');

    await closeDatabase();
    logger.info('Database connections closed cleanly');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during graceful shutdown');
    process.exit(1);
  } finally {
    clearTimeout(shutdownTimeout);
  }
};

const handleShutdownSignal = (signal: string): void => {
  gracefulShutdown(signal).catch((err: unknown) => {
    logger.error({ err }, 'Unexpected error during graceful shutdown');
    process.exit(1);
  });
};

process.on('SIGTERM', () => handleShutdownSignal('SIGTERM'));
process.on('SIGINT', () => handleShutdownSignal('SIGINT'));
