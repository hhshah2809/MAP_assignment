export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Address {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  countryCode: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  lineNumber: number;
  itemName: string;
  sku?: string | null;
  description?: string | null;
  quantity: string;
  unitOfMeasure: string;
  unitPrice: string;
  lineTotal: string;
  weightKg?: string | null;
  lengthCm?: string | null;
  widthCm?: string | null;
  heightCm?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerReference?: string | null;
  origin: Address;
  destination: Address;
  currencyCode: string;
  subtotal: string;
  taxAmount: string;
  shippingAmount: string;
  discountAmount: string;
  totalAmount: string;
  status: OrderStatus;
  notes?: string | null;
  requestedPickupAt?: string | null;
  requestedDeliveryAt?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  items?: OrderItem[];
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  previousStatus: string | null;
  newStatus: string;
  changedBy: string | null;
  reason: string | null;
  createdAt: string;
}

export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  attempts: number;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  publishedAt?: string | null;
}

export interface IdempotencyRecord {
  id: string;
  idempotencyKey: string;
  requestHash: string;
  responseStatus: number | null;
  responseBody: Record<string, unknown> | null;
  orderId: string | null;
  createdAt: string;
  expiresAt: string;
}
