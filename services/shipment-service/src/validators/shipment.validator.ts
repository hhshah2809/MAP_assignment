import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const locationSchema = z.object({
  name: z.string().trim().max(150).optional().nullable(),
  address: z.string().trim().min(1, 'Address is required').max(255),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().max(100).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  countryCode: z.string().trim().toUpperCase().length(2, 'Country code must be 2 uppercase letters'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180)
});

export const shipmentStatusEnum = z.enum([
  'PENDING',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'FAILED'
]);

export const createShipmentSchema = z.object({
  orderId: z.string().regex(uuidRegex, 'orderId must be a valid UUID'),
  trackingNumber: z.string().trim().max(60).optional(),
  carrierName: z.string().trim().max(120).optional().nullable(),
  truckNumber: z.string().trim().max(60).optional().nullable(),
  driverName: z.string().trim().max(120).optional().nullable(),
  driverPhone: z.string().trim().max(40).optional().nullable(),
  origin: locationSchema,
  destination: locationSchema,
  scheduledPickup: z.string().datetime().optional().nullable(),
  scheduledDelivery: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable()
});

export const updateShipmentStatusSchema = z.object({
  status: shipmentStatusEnum,
  notes: z.string().trim().max(1000).optional().nullable(),
  changedBy: z.string().trim().max(100).optional().nullable()
});

export const updateShipmentAssignmentSchema = z.object({
  carrierName: z.string().trim().min(1, 'Carrier name is required').max(120),
  truckNumber: z.string().trim().max(60).optional().nullable(),
  driverName: z.string().trim().max(120).optional().nullable(),
  driverPhone: z.string().trim().max(40).optional().nullable()
});

export const listShipmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: shipmentStatusEnum.optional(),
  orderId: z.string().regex(uuidRegex).optional(),
  carrierName: z.string().trim().optional(),
  trackingNumber: z.string().trim().optional()
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentStatusInput = z.infer<typeof updateShipmentStatusSchema>;
export type UpdateShipmentAssignmentInput = z.infer<typeof updateShipmentAssignmentSchema>;
export type ListShipmentsQuery = z.infer<typeof listShipmentsQuerySchema>;
