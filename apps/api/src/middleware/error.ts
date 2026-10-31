import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  logger.error({ err, reqId: req.id }, 'Unhandled request error');

  const statusCode = 500;
  const isProduction = env.NODE_ENV === 'production';

  res.status(statusCode).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction ? 'An unexpected internal error occurred.' : err.message,
      requestId: req.id,
    },
  });
};