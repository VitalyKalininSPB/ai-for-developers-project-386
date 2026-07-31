# syntax=docker/dockerfile:1

# ---------- Build ----------
FROM node:20-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix backend

COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend

COPY backend ./backend
COPY frontend ./frontend

RUN npm run build --prefix backend \
  && npm run build --prefix frontend \
  && npm prune --omit=dev --prefix backend

# ---------- Runtime ----------
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=4010
ENV DB_FILE=/app/data/app.db

WORKDIR /app

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/data && chown -R node:node /app

EXPOSE 4010
VOLUME ["/app/data"]

USER node

CMD ["node", "backend/dist/server.js"]
