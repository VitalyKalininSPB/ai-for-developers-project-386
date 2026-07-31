import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

const PORT = Number(process.env.PORT) || 4010;
const DB_FILE = process.env.DB_FILE ?? fileURLToPath(new URL('../data/app.db', import.meta.url));

const db = openDatabase(DB_FILE);
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT} (db: ${DB_FILE})`);
});
