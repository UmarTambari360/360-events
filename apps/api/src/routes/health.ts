import { Router, Request, Response } from 'express';
import { queryClient } from '../db/index.js';
import { logger } from '../lib/logger.js';

export const healthRouter = Router();

// Liveness check - verifies the Express process is running
healthRouter.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness check - verifies database connectivity
healthRouter.get('/ready', async (req: Request, res: Response) => {
  try {
    // Simple query to ensure database connection is healthy
    await queryClient`SELECT 1`;
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    logger.error({ err: error }, 'Readiness check failed');
    res.status(503).json({ status: 'unavailable' });
  }
});