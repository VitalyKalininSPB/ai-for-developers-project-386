import { Router } from 'express';
import type { Db } from './db.js';
import * as booking from './lib/booking.js';

export function createRouter(db: Db): Router {
  const router = Router();

  router.get('/owners/:ownerId/event-types', (req, res) => {
    res.json(booking.listEventTypesForOwner(db, req.params.ownerId));
  });

  router.get('/owners/:ownerId/free-slots', (req, res) => {
    const { date, eventTypeId } = req.query;
    if (typeof date !== 'string' || typeof eventTypeId !== 'string') {
      res.status(422).json({ error: 'Missing query parameters: date, eventTypeId' });
      return;
    }
    res.json(booking.listFreeSlots(db, req.params.ownerId, date, eventTypeId));
  });

  router.get('/owners/:ownerId/slots', (req, res) => {
    const { date } = req.query;
    if (typeof date !== 'string') {
      res.status(422).json({ error: 'Missing query parameter: date' });
      return;
    }
    res.json(booking.listSlotsForOwner(db, req.params.ownerId, date));
  });

  router.post('/slots', (req, res) => {
    const slot = booking.createSlot(db, req.body ?? {});
    res.status(201).json(slot);
  });

  router.patch('/slots/:slotId', (req, res) => {
    if (req.body?.status !== 'cancelled') {
      res.status(422).json({ error: 'Only status: "cancelled" is supported' });
      return;
    }
    res.json(booking.cancelSlot(db, req.params.slotId));
  });

  return router;
}
