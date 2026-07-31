import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

const PORT = Number(process.env.PORT) || 4010;
const DB_FILE = process.env.DB_FILE ?? fileURLToPath(new URL('../data/app.db', import.meta.url));
const FRONTEND_DIST = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

const db = openDatabase(DB_FILE);
const app = createApp(db);

if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path === '/api' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT} (db: ${DB_FILE})`);
});
