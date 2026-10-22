import { IdempotencyRecord } from './order.types';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      idempotencyKey?: string;
      idempotencyRecord?: IdempotencyRecord;
    }
  }
}
