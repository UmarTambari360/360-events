import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import pino from 'pino';
import { z } from 'zod';
import dotenv from 'dotenv';
import { db } from '@360events/api/db';
import { WorkerRunner } from './lib/runner.js';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  WORKER_PORT: z.coerce.number().default(3001),
});

const env = envSchema.parse(process.env);
const logger = pino({ level: env.NODE_ENV === 'test' ? 'silent' : 'info' });

const runner = new WorkerRunner({ database: db, logger });

const getStatus = () => ({
  status: 'alive',
  processing: true,
  message: 'Worker is actively polling',
});

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/health' || req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getStatus()));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(env.WORKER_PORT, () => {
  logger.info(`Worker status server listening on port ${env.WORKER_PORT}`);
});

if (env.NODE_ENV !== 'test') {
  runner.start().catch((err: unknown) => {
    logger.fatal({ err }, 'Worker loop crashed completely');
    process.exit(1);
  });
}

let isShuttingDown = false;

const gracefulShutdown = (signal: string): void => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Worker received shutdown signal, draining jobs...');

  const shutdownTimeout = setTimeout(() => {
    logger.fatal('Worker forced to shut down after timeout');
    process.exit(1);
  }, 10000);
  shutdownTimeout.unref();

  const finishShutdown = async (): Promise<void> => {
    await runner.stop();

    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    clearTimeout(shutdownTimeout);
    logger.info('Worker shut down cleanly');
    process.exit(0);
  };

  finishShutdown().catch((err: unknown) => {
    logger.error({ err }, 'Error during worker shutdown');
    process.exit(1);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
