# REST API Specification — Logistics Control Tower

All APIs adopt standard JSON representations, UTC ISO 8601 timestamps, and the uniform path prefix `/api/v1`.

---

## 1. MS1 — Order Service (`http://localhost:3001`)

### `GET /health` & `GET /ready`
- Return status `200 OK` with JSON health breakdown.

### `POST /api/v1/orders`
- **Headers**: `Idempotency-Key` (required UUID or unique string)
- **Body**:
  ```json
  {
    "customerId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "customerReference": "PO-9921",
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
    "items": [
      {
        "itemName": "Hydraulic Valves",
        "sku": "VALVE-01",
        "quantity": 10,
        "unitOfMeasure": "EA",
        "unitPrice": 45.50
      }
    ]
  }
  ```

### `GET /api/v1/orders`
- Query parameters: `page`, `limit`, `status`, `customerId`, `orderNumber`, `sortBy`, `sortOrder`.

### `GET /api/v1/orders/:id`
- Returns order object with calculated decimal totals and item line records.

### `PATCH /api/v1/orders/:id`
- Update allowed fields (`customerReference`, `notes`, `destination`, etc.) with optimistic lock `version`.

### `POST /api/v1/orders/:id/confirm`
- Transitions order from `PENDING` to `CONFIRMED`.
- Enqueues `order.confirmed.v1` in transactional outbox.

### `POST /api/v1/orders/:id/cancel`
- Body: `{ "reason": "Customer cancellation request" }`. Transitions order to `CANCELLED`.

---

## 2. MS2 — Shipment Service (`http://localhost:3002`)

### `GET /health` & `GET /ready`
- Return status `200 OK` with database ping.

### `POST /api/v1/shipments`
- **Body**:
  ```json
  {
    "orderId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "trackingNumber": "TRK-20261022-8812",
    "carrierName": "Apex Freight",
    "origin": {
      "name": "Seattle Distribution Center",
      "address": "100 Industrial Pkwy",
      "city": "Seattle",
      "state": "WA",
      "postalCode": "98101",
      "countryCode": "US",
      "latitude": 47.6062,
      "longitude": -122.3321
    },
    "destination": {
      "name": "Portland Depot",
      "address": "500 Commercial Way",
      "city": "Portland",
      "state": "OR",
      "postalCode": "97201",
      "countryCode": "US",
      "latitude": 45.5152,
      "longitude": -122.6784
    },
    "scheduledPickup": "2026-10-22T10:00:00.000Z",
    "scheduledDelivery": "2026-10-22T16:00:00.000Z"
  }
  ```

### `GET /api/v1/shipments`
- Query parameters: `page`, `limit`, `status`, `orderId`, `carrierName`.

### `GET /api/v1/shipments/:id`
- Returns shipment record, carrier info, origin/destination coordinates, and status audit trail.

### `PATCH /api/v1/shipments/:id/status`
- **Body**:
  ```json
  {
    "status": "IN_TRANSIT",
    "notes": "Driver departed origin terminal",
    "changedBy": "dispatcher-01"
  }
  ```

### `PATCH /api/v1/shipments/:id/assignment`
- **Body**:
  ```json
  {
    "carrierName": "Apex Freight",
    "truckNumber": "TRK-904",
    "driverName": "Jane Doe",
    "driverPhone": "+1-555-0199"
  }
  ```

---

## 3. MS3 — Tracking Service (`http://localhost:3003`)

### `GET /health` & `GET /ready`
- Returns MongoDB connectivity status.

### `POST /api/v1/tracking/locations`
- Ingests GPS telemetry ping.
- **Body**:
  ```json
  {
    "eventId": "b7391993-9c2b-4fa8-a8ee-cfad31737e42",
    "shipmentId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "latitude": 47.1234,
    "longitude": -122.4567,
    "speedKmh": 72.4,
    "headingDeg": 185.0,
    "altitudeM": 110.5,
    "timestamp": "2026-10-22T08:30:00.000Z"
  }
  ```

### `POST /api/v1/tracking/locations/batch`
- Ingests array of telemetry pings for high-throughput buffering.

### `GET /api/v1/tracking/shipments/:shipmentId/latest`
- Returns the most recent validated GPS point, speed, and timestamp. Monotonically protected against out-of-order pings.

### `GET /api/v1/tracking/shipments/:shipmentId/history`
- Returns chronological breadcrumb list of recorded GPS locations.

### `GET /api/v1/tracking/shipments/:shipmentId/route`
- Returns GeoJSON LineString suitable for Leaflet map rendering.

### `POST /api/v1/tracking/simulator/start`
- Starts background simulator steps or moves shipment towards destination.

### `POST /api/v1/tracking/simulator/step`
- Advances simulation by 1 coordinate waypoint towards destination.

---

## 4. MS4 — ETA & Risk Prediction Service (`http://localhost:3004`)

### `GET /health` & `GET /ready`
- Return status `200 OK` with JSON runtime metadata.

### `POST /api/v1/predictions/eta`
- Computes deterministic baseline ETA based on Haversine distance, speed, and schedule.
- **Body**:
  ```json
  {
    "shipmentId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "currentLat": 47.1234,
    "currentLon": -122.4567,
    "destLat": 45.5152,
    "destLon": -122.6784,
    "currentSpeedKmh": 72.0,
    "averageSpeedKmh": 65.0,
    "scheduledDelivery": "2026-10-22T16:00:00.000Z"
  }
  ```
- **Response**:
  ```json
  {
    "shipmentId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "remainingDistanceKm": 182.4,
    "estimatedTravelHours": 2.8,
    "estimatedDelivery": "2026-10-22T14:48:00.000Z",
    "riskLevel": "LOW",
    "delayRiskScore": 0.12,
    "explanatoryFactors": [
      "Remaining distance: 182.4 km at effective speed 65.0 km/h",
      "Predicted arrival 1.2 hours ahead of scheduled delivery window",
      "No critical route delays or stationary idle time"
    ]
  }
  ```

### `GET /api/v1/predictions/shipments/:shipmentId`
- Fetches real-time prediction for given shipment by aggregating telemetry and destination data.
