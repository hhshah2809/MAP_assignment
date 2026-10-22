import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database';
import { sendSuccess, sendError } from '../utils/api-response';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'UP',
    service: 'order-service',
    timestamp: new Date().toISOString()
  });
});

router.get('/ready', async (_req: Request, res: Response) => {
  const isDbHealthy = await checkDatabaseConnection();

  if (isDbHealthy) {
    sendSuccess(res, {
      status: 'READY',
      service: 'order-service',
      checks: {
        database: 'CONNECTED'
      },
      timestamp: new Date().toISOString()
    });
  } else {
    sendError(
      res,
      503,
      'DATABASE_UNAVAILABLE',
      'The service is not ready because MySQL database is unreachable.',
      { database: 'DISCONNECTED' }
    );
  }
});

export default router;
