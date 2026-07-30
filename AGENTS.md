# Project: Time Slot Booking (Calendly-like)

## Stack
- Frontend: React 18 + Vite 5 (`frontend/`)
- API spec: TypeSpec (`main.tsp`) → OpenAPI (`openapi.yaml`)
- Mock: Express 5 server (in-memory data)

## Architecture (3-level mock)

```
Browser → Vite Dev (:5173) → proxy /api/* → Mock Server (:4010)
```

1. **Vite proxy** (`frontend/vite.config.js`) — перенаправляет `/api/*` на `localhost:4010`
2. **Mock server** (`frontend/mock-server.js`) — Express, данные в памяти, те же endpoint'ы что в openapi.yaml
3. **React SPA** — ходит на `/api/*`, не знает про мок

## Commands

| Command | What |
|---|---|
| `npm run dev` | Vite frontend only |
| `npm run mock` | Mock server on :4010 |
| `npm run dev:mock` | Both (mock + vite) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Key files

| File | Role |
|---|---|
| `frontend/src/api.js` | HTTP client, all endpoints |
| `frontend/src/App.jsx` | State, data loading, routing |
| `frontend/mock-server.js` | Express mock with in-memory store |
| `main.tsp` | API type definition (TypeSpec) |
| `openapi.yaml` | Generated OpenAPI spec |

## Mock data
- Owner: `owner-1` (hardcoded in `App.jsx`)
- Event types: Quick Chat (15min), 30-min Meeting, 1-hour Workshop
- Working hours: Mon-Fri 09:00-18:00, Sat 10:00-16:00, Sun off

