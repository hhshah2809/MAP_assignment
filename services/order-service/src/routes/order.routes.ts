import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router = Router();

// Create order (Enforce Idempotency-Key)
router.post(
  '/',
  idempotencyMiddleware({ required: true }),
  orderController.createOrder.bind(orderController)
);

// List orders with filters & pagination
router.get('/', orderController.listOrders.bind(orderController));

// Get order by human-readable order number (declared before :id to prevent shadowing)
router.get('/number/:orderNumber', orderController.getOrderByOrderNumber.bind(orderController));

// Get order by UUID
router.get('/:id', orderController.getOrderById.bind(orderController));

// Update permitted fields with optimistic locking
router.patch('/:id', orderController.updateOrder.bind(orderController));

// Transition status to CONFIRMED
router.post('/:id/confirm', orderController.confirmOrder.bind(orderController));

// Transition status to CANCELLED
router.post('/:id/cancel', orderController.cancelOrder.bind(orderController));

// Get order status transition history
router.get('/:id/history', orderController.getOrderHistory.bind(orderController));

export default router;
