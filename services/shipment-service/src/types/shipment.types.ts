export type ShipmentStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export interface LocationPoint {
  name?: string | null;
  address: string;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  countryCode: string;
  latitude: number;
  longitude: number;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  orderId: string;
  carrierName?: string | null;
  truckNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  origin: LocationPoint;
  destination: LocationPoint;
  scheduledPickup?: string | null;
  scheduledDelivery?: string | null;
  actualPickup?: string | null;
  actualDelivery?: string | null;
  status: ShipmentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ShipmentStatusHistory {
  id: string;
  shipmentId: string;
  previousStatus: string | null;
  newStatus: string;
  changedBy?: string | null;
  reason?: string | null;
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
