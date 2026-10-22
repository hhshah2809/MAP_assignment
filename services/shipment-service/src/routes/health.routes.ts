import { Router, Request, Response } from 'express';
import { testConnection } from '../config/database';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    service: 'shipment-service',
    timestamp: new Date().toISOString()
  });
});

router.get('/ready', async (_req: Request, res: Response) => {
  const isDbReady = await testConnection();
  if (isDbReady) {
    res.status(200).json({
      status: 'READY',
      service: 'shipment-service',
      database: 'CONNECTED',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'NOT_READY',
      service: 'shipment-service',
      database: 'DISCONNECTED',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
