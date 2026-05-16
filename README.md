# Smart Expense Tracker

Full-stack expense tracking with React, Tailwind, Node/Express, MongoDB, JWT auth, budgets, insights, and data-trust warnings.

## Prerequisites

- **Node.js** 18+
- **MongoDB** (optional for quick local runs — see below)

## 1. Database options

**Option A — No MongoDB installed (quickest):** in `backend/.env` set `USE_MEMORY_DB=true`. The API uses an embedded MongoDB binary via `mongodb-memory-server` (the **first** start may download ~600MB once; later starts are fast). Data is cleared when the server stops. The `npm run seed` script does **not** share this database; register a user in the UI instead.

**Option B — Persistent MongoDB:** install MongoDB locally, use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), or run Docker:

```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

Set `USE_MEMORY_DB=false` and `MONGODB_URI=mongodb://127.0.0.1:27017/smart_expense_tracker` (or your Atlas URI).

## 2. Backend

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env` if needed:

- `MONGODB_URI` — default `mongodb://127.0.0.1:27017/smart_expense_tracker`
- `JWT_SECRET` — use a long random string in production
- `CLIENT_ORIGIN` — frontend URL (default `http://localhost:5173`)

Install and run:

```bash
npm install
npm run dev
```

API: `http://localhost:5000` — health check: `GET http://localhost:5000/api/health`

### Optional: sample data

With the API running and MongoDB up:

```bash
cd backend
npm run seed
```

Creates user **demo@example.com** / **password123** and sample transactions (skipped if data already exists).

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the backend.

### Production build

```bash
cd frontend
npm run build
npm run preview
```

Set `VITE_API_URL` to your API base URL if the frontend is not served behind the same origin (e.g. `VITE_API_URL=https://api.example.com`).

## Project layout

- `backend/` — Express API, Mongoose models, JWT, routes
- `frontend/` — Vite + React + Tailwind + Recharts
- `backend/sample-data/dummy-transactions.json` — example row shapes for documentation

## API overview

| Area        | Path |
|------------|------|
| Auth       | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Transactions | `GET/POST /api/transactions`, `GET /api/transactions/export.csv`, `PATCH/DELETE /api/transactions/:id` |
| Budgets    | `GET /api/budgets`, `PUT /api/budgets` |
| Analytics  | `GET /api/analytics/summary`, `/monthly`, `/weekly` |
| Insights   | `GET /api/insights` |
| Trust      | `GET /api/trust/status` |
| Mock import | `POST /api/mock/ingest` |
