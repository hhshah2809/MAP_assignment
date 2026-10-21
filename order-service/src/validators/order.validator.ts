import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const currencyCodeRegex = /^[A-Z]{3}$/;
const countryCodeRegex = /^[A-Z]{2}$/;

const addressSchema = z.object({
  addressLine1: z.string().trim().min(1, 'Address line 1 is required').max(255),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().max(100).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
  countryCode: z.string().trim().toUpperCase().regex(countryCodeRegex, 'Country code must be a 2-letter uppercase ISO code (e.g. IN, US)')
});

const orderItemInputSchema = z.object({
  itemName: z.string().trim().min(1, 'Item name is required').max(200),
  sku: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unitOfMeasure: z.string().trim().min(1, 'Unit of measure is required').max(20),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  weightKg: z.coerce.number().min(0, 'Weight cannot be negative').nullable().optional(),
  lengthCm: z.coerce.number().min(0, 'Length cannot be negative').nullable().optional(),
  widthCm: z.coerce.number().min(0, 'Width cannot be negative').nullable().optional(),
  heightCm: z.coerce.number().min(0, 'Height cannot be negative').nullable().optional()
});

const isoDateString = z.string().datetime({ message: 'Must be a valid ISO 8601 date string' });

export const createOrderSchema = z
  .object({
    customerId: z.string().regex(uuidRegex, 'customerId must be a valid UUID'),
    customerReference: z.string().trim().max(100).nullable().optional(),
    currencyCode: z.string().trim().toUpperCase().regex(currencyCodeRegex, 'currencyCode must be a 3-letter ISO code (e.g. INR, USD)'),
    origin: addressSchema,
    destination: addressSchema,
    items: z
      .array(orderItemInputSchema)
      .min(1, 'At least one item is required.')
      .max(100, 'Cannot exceed 100 items per order.'),
    taxAmount: z.coerce.number().min(0, 'taxAmount cannot be negative').default(0),
    shippingAmount: z.coerce.number().min(0, 'shippingAmount cannot be negative').default(0),
    discountAmount: z.coerce.number().min(0, 'discountAmount cannot be negative').default(0),
    notes: z.string().trim().max(2000).nullable().optional(),
    requestedPickupAt: isoDateString.nullable().optional(),
    requestedDeliveryAt: isoDateString.nullable().optional()
  })
  .refine(
    (data) => {
      if (data.requestedPickupAt && data.requestedDeliveryAt) {
        return new Date(data.requestedDeliveryAt).getTime() > new Date(data.requestedPickupAt).getTime();
      }
      return true;
    },
    {
      message: 'requestedDeliveryAt must be later than requestedPickupAt',
      path: ['requestedDeliveryAt']
    }
  );

export const updateOrderSchema = z
  .object({
    version: z.coerce.number().int().positive().optional(),
    customerReference: z.string().trim().max(100).nullable().optional(),
    origin: addressSchema.optional(),
    destination: addressSchema.optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    requestedPickupAt: isoDateString.nullable().optional(),
    requestedDeliveryAt: isoDateString.nullable().optional()
  })
  .refine(
    (data) => {
      if (data.requestedPickupAt && data.requestedDeliveryAt) {
        return new Date(data.requestedDeliveryAt).getTime() > new Date(data.requestedPickupAt).getTime();
      }
      return true;
    },
    {
      message: 'requestedDeliveryAt must be later than requestedPickupAt',
      path: ['requestedDeliveryAt']
    }
  );

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(500, 'Cancellation reason cannot exceed 500 characters').nullable().optional()
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  customerId: z.string().regex(uuidRegex).optional(),
  orderNumber: z.string().trim().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'totalAmount', 'orderNumber', 'status']).default('createdAt'),
  sortOrder: z.preprocess(
    (val) => (typeof val === 'string' ? val.toLowerCase() : val),
    z.enum(['asc', 'desc']).default('desc')
  )
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
