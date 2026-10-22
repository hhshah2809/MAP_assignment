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
  quantity: string | number;
  unitOfMeasure: string;
  unitPrice: string | number;
  lineTotal: string | number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerReference?: string | null;
  origin: Address;
  destination: Address;
  currencyCode: string;
  subtotal: string | number;
  taxAmount: string | number;
  shippingAmount: string | number;
  discountAmount: string | number;
  totalAmount: string | number;
  status: OrderStatus;
  notes?: string | null;
  requestedPickupAt?: string | null;
  requestedDeliveryAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

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
  status: ShipmentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface GPSLocation {
  shipmentId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  headingDeg: number;
  altitudeM: number;
  timestamp: string;
  updatedAt: string;
}

export interface PredictionData {
  shipmentId: string;
  remainingDistanceKm: number;
  effectiveSpeedKmh: number;
  estimatedTravelHours: number;
  estimatedDelivery: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  delayRiskScore: number;
  explanatoryFactors: string[];
}
