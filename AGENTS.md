# Project: Time Slot Booking (Calendly-like)

## Stack
- Frontend: React 18 + Vite 5 (`frontend/`)
- Backend: Express 5 + TypeScript + SQLite (better-sqlite3) (`backend/`)
- API spec: TypeSpec (`main.tsp`) → OpenAPI (`openapi.yaml`)

## Architecture

```
Browser → Vite Dev (:5173) → proxy /api/* → Backend (:4010) → SQLite
E2E (Playwright) → Vite Dev (:5174) → proxy /api/* → Backend (:4011) → SQLite (e2e.db)
```

1. **Vite proxy** (`frontend/vite.config.js`) — перенаправляет `/api/*` на `localhost:4010` (переопределяется через `API_TARGET` для E2E)
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
| `npm test` (в `e2e/`) | Playwright E2E (chromium): поднимает backend на свежей БД `backend/data/e2e.db` (:4011) + Vite (:5174) |

E2E (`e2e/`): первый запуск требует `npm install` в `e2e/` и `npx playwright install chromium`. Порт 4011/5174 изолированы от dev-окружения (4010/5173). Playwright запинован на 1.49.1 — Node 18.

## Commit conventions

Commits следуют [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

- `feat` — новая функциональность
- `fix` — исправление бага
- `test` — тесты (unit/e2e)
- `docs` — документация (README, AGENTS.md)
- `refactor` — рефакторинг без изменения поведения
- `chore` — сборка, зависимости, прочее
- `style` — форматирование, без изменения логики
- `perf` — оптимизация производительности
- `BREAKING CHANGE:` в описании/футере — несовместимые изменения API

Примеры: `feat(booking): add cancellation`, `fix(api): return 409 on slot conflict`, `test(e2e): cover booking flow`.

## Key files

| File | Role |
|---|---|
| `frontend/src/api.js` | HTTP client, all endpoints |
| `frontend/src/App.jsx` | State, data loading, routing |
| `backend/src/server.ts` | Backend entry point (:4010) |
| `backend/src/app.ts` | Express app factory (used by tests) |
| `backend/src/db.ts` | SQLite schema + seed (`owner-1`, event types) |
| `backend/src/lib/booking.ts` | Business logic: free slots, booking, cancellation |
| `e2e/playwright.config.js` | Playwright config: webServer (backend :4011 + Vite :5174), `workers: 1`, `timezoneId: UTC` |
| `e2e/tests/booking.spec.js` | E2E: бронь, отмена, смена event type, нерабочий день, конфликт 409 |
| `main.tsp` | API type definition (TypeSpec) |
| `openapi.yaml` | Generated OpenAPI spec |

## Data
- Owner: `owner-1` (hardcoded in `App.jsx`)
- Event types: Quick Chat (15min, buffer 5), 30-min Meeting, 1-hour Workshop (buffer 10)
- Working hours: Mon-Fri 09:00-18:00, Sat 10:00-16:00, Sun off
- DB file: `backend/data/app.db` (gitignored); пересоздаётся при старте, если пуст

