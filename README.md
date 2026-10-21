# Logistics Control Tower — Distributed Microservices Platform

A distributed, event-driven logistics management platform consisting of 5 autonomous microservices:

1. **Microservice 1: Order Service (`order-service`)** — *Implemented*  
   - **Stack**: Node.js + TypeScript + Express.js + MySQL 8.0
   - **Port**: `3001` | **Prefix**: `/api/v1`
   - **Purpose**: Order creation, validation, exact decimal monetary calculations, order lifecycle (`PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `CANCELLED`), idempotency guarantees, and transactional outbox event publishing.
2. **Microservice 2: Shipment Service** — *Java + Spring Boot + PostgreSQL*
3. **Microservice 3: Tracking Service** — *Go + MongoDB*
4. **Microservice 4: AI Prediction Service** — *Python + FastAPI + Redis*
5. **Microservice 5: Dashboard & Search Service** — *C# + .NET + Elasticsearch*

---

## Simplest Way to Run MS1 (Order Service)

Make sure local **MySQL 8.0** is running on port `3306`. Then open **Windows PowerShell** and run:

```powershell
# 1. Enter the Order Service directory
cd e:\map_assignment\order-service

# 2. Copy the preconfigured environment file
Copy-Item .env.example .env

# 3. Install packages
npm install

# 4. Create database and apply migrations
npm run db:migrate

# 5. (Optional) Seed realistic demonstration orders
npm run db:seed

# 6. Start the service
npm run dev
```

The service will start immediately on **`http://localhost:3001`**.

---

## Quick Verification

In a new terminal window, run:

```powershell
# Health check (Liveness)
Invoke-RestMethod -Uri "http://localhost:3001/health" | ConvertTo-Json

# Database readiness check (MySQL)
Invoke-RestMethod -Uri "http://localhost:3001/ready" | ConvertTo-Json

# View seeded orders
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/orders?page=1&limit=5" | ConvertTo-Json -Depth 5
```

---

## Run Automated Tests

To run the complete test suite (all 38 unit & MySQL integration tests):

```powershell
cd e:\map_assignment\order-service
npm run test
```

---

## Alternative: Run with Docker Compose

```powershell
cd e:\map_assignment\order-service
docker compose up -d --build
```

---

## Documentation Links
- Full Architecture, ER Diagram & API Reference: [`order-service/README.md`](./order-service/README.md)
- Postman Collection: [`order-service/postman_collection.json`](./order-service/postman_collection.json)
