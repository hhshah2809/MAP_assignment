# Event Contracts Specification — Logistics Control Tower

All asynchronous communication uses versioned JSON events routed through the RabbitMQ topic exchange `logistics.events`.

## Common Event Envelope

Every event conforms to this standard structure:

```json
{
  "eventId": "c7a6e14f-8cfd-4d43-bb90-b98a0c7c8c3a",
  "eventType": "domain.action.v1",
  "aggregateId": "550e8400-e29b-41d4-a716-446655440000",
  "aggregateType": "ORDER",
  "timestamp": "2026-10-22T08:00:00.000Z",
  "version": 1,
  "payload": {}
}
```

---

## Event Catalog

### 1. `order.created.v1`
- **Publisher**: MS1 (Order Service)
- **Subscribers**: Audit / Notification services
- **Routing Key**: `order.created.v1`
- **Payload**:
  ```json
  {
    "orderId": "UUID",
    "orderNumber": "ORD-20261022-XXXX",
    "customerId": "UUID",
    "totalAmount": "1250.00",
    "currencyCode": "USD",
    "origin": { "city": "Seattle", "countryCode": "US" },
    "destination": { "city": "Portland", "countryCode": "US" },
    "status": "PENDING"
  }
  ```

### 2. `order.confirmed.v1`
- **Publisher**: MS1 (Order Service)
- **Subscribers**: MS2 (Shipment Service)
- **Routing Key**: `order.confirmed.v1`
- **Purpose**: Triggers automated creation / staging of a shipment in MS2.
- **Payload**:
  ```json
  {
    "orderId": "UUID",
    "orderNumber": "ORD-20261022-XXXX",
    "customerId": "UUID",
    "totalAmount": "1250.00",
    "currencyCode": "USD",
    "origin": {
      "addressLine1": "100 Industrial Pkwy",
      "city": "Seattle",
      "state": "WA",
      "postalCode": "98101",
      "countryCode": "US"
    },
    "destination": {
      "addressLine1": "500 Commercial Way",
      "city": "Portland",
      "state": "OR",
      "postalCode": "97201",
      "countryCode": "US"
    },
    "confirmedAt": "2026-10-22T08:05:00.000Z"
  }
  ```

### 3. `shipment.created.v1`
- **Publisher**: MS2 (Shipment Service)
- **Subscribers**: MS3 (Tracking Service), MS4 (Prediction Service), Frontend WebSockets / SSE
- **Routing Key**: `shipment.created.v1`
- **Payload**:
  ```json
  {
    "shipmentId": "UUID",
    "trackingNumber": "TRK-20261022-XXXX",
    "orderId": "UUID",
    "status": "PENDING",
    "origin": { "latitude": 47.6062, "longitude": -122.3321, "city": "Seattle" },
    "destination": { "latitude": 45.5152, "longitude": -122.6784, "city": "Portland" },
    "createdAt": "2026-10-22T08:05:02.000Z"
  }
  ```

### 4. `shipment.status_changed.v1`
- **Publisher**: MS2 (Shipment Service)
- **Subscribers**: MS1 (Order Service), MS4 (Prediction Service)
- **Routing Key**: `shipment.status_changed.v1`
- **Payload**:
  ```json
  {
    "shipmentId": "UUID",
    "orderId": "UUID",
    "previousStatus": "PENDING",
    "newStatus": "ASSIGNED",
    "carrierId": "FEDEX-FREIGHT",
    "vehiclePlate": "WA-99214",
    "driverName": "Jane Doe",
    "timestamp": "2026-10-22T08:15:00.000Z"
  }
  ```

### 5. `tracking.location_received.v1`
- **Publisher**: MS3 (Tracking Service)
- **Subscribers**: MS4 (Prediction Service), Realtime Dashboards
- **Routing Key**: `tracking.location_received.v1`
- **Payload**:
  ```json
  {
    "eventId": "UUID",
    "shipmentId": "UUID",
    "latitude": 47.1234,
    "longitude": -122.4567,
    "speedKmh": 68.5,
    "headingDeg": 182.0,
    "timestamp": "2026-10-22T08:30:00.000Z"
  }
  ```

### 6. `prediction.updated.v1`
- **Publisher**: MS4 (Prediction Service)
- **Subscribers**: MS2 (Shipment Service), Operations Alerts
- **Routing Key**: `prediction.updated.v1`
- **Payload**:
  ```json
  {
    "shipmentId": "UUID",
    "estimatedDelivery": "2026-10-22T14:30:00.000Z",
    "remainingDistanceKm": 142.3,
    "riskLevel": "LOW",
    "delayRiskScore": 0.15,
    "explanatoryFactors": [
      "Vehicle traveling at 68.5 km/h on target route",
      "Zero prolonged unscheduled stops detected"
    ],
    "calculatedAt": "2026-10-22T08:30:05.000Z"
  }
  ```

---

## Dead-Letter & Retry Strategy

- **Retry Limit**: 3 attempts with exponential backoff ($5 \times 2^{\text{attempt}}$ seconds).
- **Dead-Letter Exchange (DLX)**: `logistics.dlx` (type `direct`).
- **Dead-Letter Queue (DLQ)**: `logistics.dlq` (routing key `dead-letter`).
- **Idempotency**: Consumers verify processed `eventId` or target state machine validity before applying changes.
