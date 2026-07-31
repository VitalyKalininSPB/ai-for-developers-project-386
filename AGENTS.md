# Project: Time Slot Booking (Calendly-like)

## Stack
- Frontend: React 18 + Vite 5 (`frontend/`)
- Backend: Express 5 + TypeScript + SQLite (better-sqlite3) (`backend/`)
- API spec: TypeSpec (`main.tsp`) → OpenAPI (`openapi.yaml`)

## Architecture

```
Browser → Vite Dev (:5173) → proxy /api/* → Backend (:4010) → SQLite
```

1. **Vite proxy** (`frontend/vite.config.js`) — перенаправляет `/api/*` на `localhost:4010`
2. **Backend** (`backend/`) — Express 5 + TypeScript, SQLite (файл `backend/data/app.db`), те же endpoint'ы что в openapi.yaml
3. **React SPA** — ходит на `/api/*`, не знает про бэкенд

## Commands

Backend commands run from `backend/` (`npm --prefix ../backend ...` из `frontend/`):

| Command | What |
|---|---|
| `npm run dev` (в `frontend/`) | Vite frontend only |
| `npm run dev` (в `backend/`) | Backend on :4010 (tsx watch) |
| `npm run dev:mock` | Both (backend + vite) |
| `npm run build` | Production build (backend: `tsc`, frontend: `vite build`) |
| `npm run lint` | ESLint (frontend + backend) |
| `npm test` (в `backend/`) | Vitest + Supertest |

## Key files

| File | Role |
|---|---|
| `frontend/src/api.js` | HTTP client, all endpoints |
| `frontend/src/App.jsx` | State, data loading, routing |
| `backend/src/server.ts` | Backend entry point (:4010) |
| `backend/src/app.ts` | Express app factory (used by tests) |
| `backend/src/db.ts` | SQLite schema + seed (`owner-1`, event types) |
| `backend/src/lib/booking.ts` | Business logic: free slots, booking, cancellation |
| `main.tsp` | API type definition (TypeSpec) |
| `openapi.yaml` | Generated OpenAPI spec |

## Data
- Owner: `owner-1` (hardcoded in `App.jsx`)
- Event types: Quick Chat (15min, buffer 5), 30-min Meeting, 1-hour Workshop (buffer 10)
- Working hours: Mon-Fri 09:00-18:00, Sat 10:00-16:00, Sun off
- DB file: `backend/data/app.db` (gitignored); пересоздаётся при старте, если пуст

