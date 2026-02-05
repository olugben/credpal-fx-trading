# FX Trading Backend

## Overview

This repository contains the backend implementation of an FX trading and wallet management system. The system allows users to:

* Create wallets automatically per user
* Fund wallets in supported currencies
* Convert currencies using real-time FX rates
* Trade between currencies
* Track all financial operations via transactions

The system is built with **NestJS**, **TypeORM**, and **PostgreSQL**, following clean architecture and domain-driven design principles suitable for financial systems.

---

## Tech Stack

* **Node.js / TypeScript**
* **NestJS** (framework)
* **TypeORM** (ORM)
* **PostgreSQL** (database)
* **Jest** (unit testing)
* **Decimal.js** (precise financial calculations)

---

## Setup Instructions

### Docker (Recommended)

The application is fully containerized using **Docker Compose**.

#### Prerequisites

* Docker
* Docker Compose

#### 1. Clone the repository

```bash
git clone https://github.com/olugben/credpal-fx-trading
cd fx-trading-backend
```

#### 2. Environment variables

Create a `.env` file in the root directory:

```env
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=fx_app
```

#### 3. Start the application

```bash
docker compose up --build
```

The API will be available at:

```
http://localhost:3000
```

Swagger documentation:

```
http://localhost:3000/api/docs
```

---

### Local Setup (Without Docker)

### Prerequisites

* Node.js >= 18
* npm or yarn
* PostgreSQL

### 1. Clone the repository

```bash
git clone https://github.com/olugben/credpal-fx-trading
cd fx-trading-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

Create a `.env` file in the root directory:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=fx_trading
```

### 4. Run database migrations

```bash
npm run build
npm run typeorm migration:run
```

### 5. Start the application

```bash
npm run start:dev
```

The server will start on:

```
http://localhost:3000
```

---

## API Documentation

### Swagger

Swagger is enabled for API exploration.

Once the app is running, visit:

```
http://localhost:3000/api/docs
```

This provides:

* Request/response schemas
* Available endpoints
* Try-it-out support

---

## Core API Endpoints (Summary)

### Wallet

* `POST /wallet` – Create wallet for user
* `GET /wallet/balances` – Get wallet balances
* `POST /wallet/fund` – Fund wallet
* `POST /wallet/convert` – Convert currency
* `POST /wallet/trade` – Trade currency

### FX

* `GET /fx/rates` – Fetch current FX rates

### Transactions

* `GET /transactions` – Retrieve transaction history

---

## Key Assumptions

* Each user has exactly one wallet
* Wallets support multiple currencies
* All monetary values are stored as **strings** and processed using `Decimal.js` to avoid floating-point errors
* FX rates are retrieved from an external provider via the `FxService`
* Wallet operations are transactional and use pessimistic locking to avoid race conditions
* Failed transaction logs do not block wallet operations

---

## Architectural Decisions

### 1. Transactional Integrity

* All wallet mutations (`fund`, `convert`, `trade`) are executed inside database transactions
* Pessimistic locks are used to prevent double-spending

### 2. Precision Handling

* `Decimal.js` is used for all monetary calculations
* Balances are stored with fixed precision (2 decimal places)

### 3. Separation of Concerns

* `WalletService`: wallet logic and balance management
* `FxService`: FX rate retrieval and validation
* `TransactionsService`: immutable transaction logging

### 4. Error Handling

* Validation errors → `400 Bad Request`
* Missing resources → `404 Not Found`
* Invalid FX data → `500 Internal Server Error`

---

## Testing

### Unit Tests

Critical business logic is covered with Jest unit tests.

Run tests:

```bash
npm run test
```



Tested areas include:

* Wallet funding
* Currency conversion
* Insufficient balance checks
* Validation logic
* Transaction logging

---

## Architecture Diagram

### High-Level System Architecture

```
                ┌──────────────┐
                │   Client     │
                │ (Web / API)  │
                └──────┬───────┘
                       │ HTTP
                       ▼
              ┌──────────────────┐
              │  NestJS API      │
              │                  │
              │ Controllers      │
              │  ├─ Wallet       │
              │  ├─ FX           │
              │  └─ Transactions │
              │                  │
              │ Services         │
              │  ├─ WalletService│
              │  ├─ FxService    │
              │  └─ Transactions │
              └──────┬───────────┘
                     │
          ┌──────────┼───────────┐
          │                          │
          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐
│ PostgreSQL       │      │ External FX API  │
│                  │      │ (Rates Provider) │
│ Wallet           │      └──────────────────┘
│ WalletBalance    │
│ Transactions     │
│ Users            │
└──────────────────┘
```

---

### Wallet & Currency Exchange Flow

```
Client
  │
  ▼
WalletController
  │
  ▼
WalletService.exchangeCurrency()
  │
  ├─ Validate amount & currency
  ├─ Start DB transaction
  ├─ Lock wallet & balances
  ├─ Fetch FX rate
  ├─ Update balances atomically
  ├─ Persist transaction record
  └─ Commit transaction
```

---



* Wallet funding flow
* Currency conversion flow
* Trade execution flow
* Database entity relationships

These diagrams help illustrate transactional boundaries and data flow.

---

## Future Improvements
Important Security Warning
The authentication approach must be improved. User identity (user ID or email) must be derived from the JWT payload when using JWT-based authentication. Performing wallet or transaction operations directly based on an email provided in the request body or query parameters is unsafe
* Idempotency keys for wallet operations
* Rate caching and fallback FX providers
* Integration tests with Testcontainers
* Audit trail and reconciliation jobs
* Admin approval workflows

---

## Author

Olugbenga Hammed

---

