import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import pino from 'pino';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  WORKER_PORT: z.coerce.number().default(3001),
});

const env = envSchema.parse(process.env);
const logger = pino({ level: env.NODE_ENV === 'test' ? 'silent' : 'info' });

// Status reporting
const getStatus = () => ({
  status: 'alive',
  processing: false,
  message: 'no handlers registered',
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

const gracefulShutdown = (signal: string): void => {
  logger.info({ signal }, 'Worker received shutdown signal, draining jobs...');
  
  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error closing worker status server');
      process.exit(1);
    }
    logger.info('Worker shut down cleanly');
    process.exit(0);
  });

  setTimeout(() => {
    logger.fatal('Worker forced to shut down after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));