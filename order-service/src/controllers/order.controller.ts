import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import {
  createOrderSchema,
  updateOrderSchema,
  cancelOrderSchema,
  listOrdersQuerySchema
} from '../validators/order.validator';
import { sendSuccess } from '../utils/api-response';
import { parsePagination } from '../utils/pagination';

const toStr = (val: unknown): string => (Array.isArray(val) ? String(val[0]) : String(val ?? ''));

export class OrderController {
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = createOrderSchema.parse(req.body);
      const idempotencyKey = req.idempotencyKey || (req.headers['idempotency-key'] as string);
      const requestId = req.id ? String(req.id) : undefined;

      const { order, isReplay } = await orderService.createOrder(
        validatedInput,
        idempotencyKey,
        requestId
      );

      const statusCode = isReplay ? 200 : 201;

      // Cache response for idempotent replays
      if (idempotencyKey && !isReplay) {
        const responseData = {
          success: true,
          data: order,
          meta: { requestId }
        };
        await orderService.cacheIdempotentResponse(idempotencyKey, statusCode, responseData, order.id);
      }

      sendSuccess(res, order, statusCode);
    } catch (err) {
      next(err);
    }
  }

  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = toStr(req.params.id);
      const order = await orderService.getOrderById(id);
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  }

  async getOrderByOrderNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderNumber = toStr(req.params.orderNumber);
      const order = await orderService.getOrderByOrderNumber(orderNumber);
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  }

  async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedQuery = listOrdersQuerySchema.parse(req.query);
      const pagination = parsePagination(validatedQuery.page, validatedQuery.limit);

      const { orders, meta } = await orderService.listOrders(
        {
          status: validatedQuery.status,
          customerId: validatedQuery.customerId,
          orderNumber: validatedQuery.orderNumber,
          createdFrom: validatedQuery.createdFrom,
          createdTo: validatedQuery.createdTo,
          sortBy: validatedQuery.sortBy,
          sortOrder: validatedQuery.sortOrder
        },
        pagination
      );

      sendSuccess(res, orders, 200, { pagination: meta });
    } catch (err) {
      next(err);
    }
  }

  async updateOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = toStr(req.params.id);
      const validatedInput = updateOrderSchema.parse(req.body);
      const updatedOrder = await orderService.updateOrder(id, validatedInput);
      sendSuccess(res, updatedOrder);
    } catch (err) {
      next(err);
    }
  }

  async confirmOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = toStr(req.params.id);
      const actorId = (req.headers['x-actor-id'] as string) || undefined;
      const requestId = req.id ? String(req.id) : undefined;
      const confirmedOrder = await orderService.confirmOrder(id, actorId, requestId);
      sendSuccess(res, confirmedOrder);
    } catch (err) {
      next(err);
    }
  }

  async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = toStr(req.params.id);
      const validatedInput = cancelOrderSchema.parse(req.body);
      const actorId = (req.headers['x-actor-id'] as string) || undefined;
      const requestId = req.id ? String(req.id) : undefined;
      const cancelledOrder = await orderService.cancelOrder(id, validatedInput, actorId, requestId);
      sendSuccess(res, cancelledOrder);
    } catch (err) {
      next(err);
    }
  }

  async getOrderHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = toStr(req.params.id);
      const history = await orderService.getOrderHistory(id);
      sendSuccess(res, history);
    } catch (err) {
      next(err);
    }
  }
}

export const orderController = new OrderController();
