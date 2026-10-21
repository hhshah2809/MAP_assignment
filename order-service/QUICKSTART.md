# Order Service — Quick Start Guide

A concise guide to running the **Order Service** locally on Windows PowerShell or via Docker Compose.

---

## 1. Prerequisites

- **Node.js**: v20 or v22+
- **MySQL 8.0**: Running locally on port 3306 (or via Docker)

---

## 2. Option A: Run Locally (Windows PowerShell)

Open PowerShell and run the following commands:

```powershell
# 1. Navigate to the service folder
cd e:\map_assignment\order-service

# 2. Copy the environment template (matches local MySQL: root / Het@2005)
Copy-Item .env.example .env

# 3. Install dependencies
npm install

# 4. Run database migrations (creates logistics_orders database and tables)
npm run db:migrate

# 5. (Optional) Seed sample demonstration orders
npm run db:seed

# 6. Start the development server (with hot reload on port 3001)
npm run dev
```

For production mode:
```powershell
npm run build
npm start
```

---

## 3. Option B: Run with Docker Compose

If Docker Desktop is running:

```powershell
cd e:\map_assignment\order-service

# Build and start MySQL and Order Service containers
docker compose up -d --build

# View real-time logs
docker compose logs -f order-service
```

---

## 4. Verify Service is Running

In a separate PowerShell window, test the endpoints:

```powershell
# 1. Check Liveness
Invoke-RestMethod -Uri "http://localhost:3001/health" | ConvertTo-Json

# 2. Check Database Readiness
Invoke-RestMethod -Uri "http://localhost:3001/ready" | ConvertTo-Json

# 3. List Orders
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/orders?page=1&limit=5" | ConvertTo-Json -Depth 5
```

---

## 5. Useful Commands

| Command | Description |
|---|---|
| `npm run test` | Run all unit and integration tests |
| `npm run test:unit` | Run fast unit tests |
| `npm run test:integration` | Run full-stack MySQL integration tests |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:seed` | Seed demo orders (`PENDING`, `CONFIRMED`, `CANCELLED`) |
| `npm run db:reset` | Reset and re-migrate development database |
| `npm run build` | Compile TypeScript into `./dist` |
