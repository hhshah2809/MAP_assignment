import { Router } from 'express';
import orderRoutes from './order.routes';

const router = Router();

router.use('/orders', orderRoutes);

export default router;
