import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { Db } from './db.js';
import { createRouter } from './routes.js';
import { ApiError } from './lib/booking.js';

export function createApp(db: Db): express.Express {
  const app = express();
  app.use(express.json());

  app.use('/api', createRouter(db));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof SyntaxError && 'status' in err) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
