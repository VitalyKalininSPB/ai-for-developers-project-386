import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { Db } from '../src/db.js';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

const MONDAY = '2026-08-03';
const SUNDAY = '2026-08-02';

let db: Db;
let app: Express;

beforeEach(() => {
  db = openDatabase(':memory:');
  db.prepare('DELETE FROM slots').run();
  app = createApp(db);
});

function insertSlot(slot: { id: string; eventTypeId: string; guestId: string; startTime: string; endTime: string; status: string }) {
  db.prepare(
    `INSERT INTO slots (id, event_type_id, guest_id, start_time, end_time, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(slot.id, slot.eventTypeId, slot.guestId, slot.startTime, slot.endTime, slot.status, new Date().toISOString());
}

describe('event types', () => {
  it('lists event types for an owner', async () => {
    const res = await request(app).get('/api/owners/owner-1/event-types');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toMatchObject({ ownerId: 'owner-1', duration: 15 });
  });

  it('returns 404 for an unknown owner', async () => {
    const res = await request(app).get('/api/owners/ghost/event-types');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Owner not found' });
  });
});

describe('free slots', () => {
  it('lists all 30-min slots on a working day', async () => {
    const res = await request(app).get(`/api/owners/owner-1/free-slots?date=${MONDAY}&eventTypeId=et-2`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(35);
    expect(res.body[0]).toEqual({ startTime: `${MONDAY}T09:00:00.000Z`, endTime: `${MONDAY}T09:30:00.000Z` });
    expect(res.body.at(-1).endTime).toBe(`${MONDAY}T18:00:00.000Z`);
  });

  it('returns an empty array on a day off', async () => {
    const res = await request(app).get(`/api/owners/owner-1/free-slots?date=${SUNDAY}&eventTypeId=et-2`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('excludes slots overlapping a confirmed booking', async () => {
    insertSlot({
      id: 's1',
      eventTypeId: 'et-2',
      guestId: 'guest-1',
      startTime: `${MONDAY}T10:00:00.000Z`,
      endTime: `${MONDAY}T10:30:00.000Z`,
      status: 'confirmed',
    });
    const res = await request(app).get(`/api/owners/owner-1/free-slots?date=${MONDAY}&eventTypeId=et-2`);
    expect(res.body).toHaveLength(32);
    expect(res.body).not.toContainEqual({ startTime: `${MONDAY}T10:00:00.000Z`, endTime: `${MONDAY}T10:30:00.000Z` });
  });

  it('applies buffer before and after a booking', async () => {
    insertSlot({
      id: 's1',
      eventTypeId: 'et-1',
      guestId: 'guest-1',
      startTime: `${MONDAY}T10:00:00.000Z`,
      endTime: `${MONDAY}T10:15:00.000Z`,
      status: 'confirmed',
    });
    const res = await request(app).get(`/api/owners/owner-1/free-slots?date=${MONDAY}&eventTypeId=et-1`);
    const starts = res.body.map((s: { startTime: string }) => s.startTime);
    expect(starts).toContain(`${MONDAY}T10:30:00.000Z`);
    expect(starts).not.toContain(`${MONDAY}T10:15:00.000Z`);
    expect(starts).not.toContain(`${MONDAY}T09:45:00.000Z`);
  });

  it('ignores cancelled bookings', async () => {
    insertSlot({
      id: 's1',
      eventTypeId: 'et-2',
      guestId: 'guest-1',
      startTime: `${MONDAY}T10:00:00.000Z`,
      endTime: `${MONDAY}T10:30:00.000Z`,
      status: 'cancelled',
    });
    const res = await request(app).get(`/api/owners/owner-1/free-slots?date=${MONDAY}&eventTypeId=et-2`);
    expect(res.body).toHaveLength(35);
  });

  it('returns 404 for an unknown event type', async () => {
    const res = await request(app).get(`/api/owners/owner-1/free-slots?date=${MONDAY}&eventTypeId=et-x`);
    expect(res.status).toBe(404);
  });
});

describe('owner slots', () => {
  it('lists bookings for a date', async () => {
    insertSlot({
      id: 's1',
      eventTypeId: 'et-2',
      guestId: 'guest-1',
      startTime: `${MONDAY}T10:00:00.000Z`,
      endTime: `${MONDAY}T10:30:00.000Z`,
      status: 'confirmed',
    });
    const res = await request(app).get(`/api/owners/owner-1/slots?date=${MONDAY}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 's1', eventTypeId: 'et-2', guestId: 'guest-1', status: 'confirmed' });
  });

  it('filters slots by date', async () => {
    insertSlot({
      id: 's1',
      eventTypeId: 'et-2',
      guestId: 'guest-1',
      startTime: `${SUNDAY}T10:00:00.000Z`,
      endTime: `${SUNDAY}T10:30:00.000Z`,
      status: 'confirmed',
    });
    const res = await request(app).get(`/api/owners/owner-1/slots?date=${MONDAY}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('create slot', () => {
  const payload = { eventTypeId: 'et-2', guestName: 'Dana Fox', guestEmail: 'dana@example.com', startTime: `${MONDAY}T10:00:00.000Z` };

  it('books a slot', async () => {
    const res = await request(app).post('/api/slots').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      eventTypeId: 'et-2',
      startTime: `${MONDAY}T10:00:00.000Z`,
      endTime: `${MONDAY}T10:30:00.000Z`,
      status: 'confirmed',
    });
    expect(res.body.id).toBeTruthy();
    expect(res.body.guestId).toMatch(/^guest-/);
  });

  it('returns 409 when the slot is already occupied', async () => {
    insertSlot({
      id: 's1',
      eventTypeId: 'et-2',
      guestId: 'guest-1',
      startTime: `${MONDAY}T10:00:00.000Z`,
      endTime: `${MONDAY}T10:30:00.000Z`,
      status: 'confirmed',
    });
    const res = await request(app).post('/api/slots').send(payload);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Slot is already occupied' });
  });

  it('returns 422 for a slot outside working hours', async () => {
    const res = await request(app)
      .post('/api/slots')
      .send({ ...payload, startTime: `${MONDAY}T08:00:00.000Z` });
    expect(res.status).toBe(422);
  });

  it('returns 422 on a day off', async () => {
    const res = await request(app)
      .post('/api/slots')
      .send({ ...payload, startTime: `${SUNDAY}T10:00:00.000Z` });
    expect(res.status).toBe(422);
  });

  it('returns 422 for an invalid event type', async () => {
    const res = await request(app).post('/api/slots').send({ ...payload, eventTypeId: 'et-x' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when fields are missing', async () => {
    const res = await request(app).post('/api/slots').send({ eventTypeId: 'et-2' });
    expect(res.status).toBe(422);
  });
});

describe('cancel slot', () => {
  it('cancels a booking', async () => {
    const created = await request(app).post('/api/slots').send({
      eventTypeId: 'et-2',
      guestName: 'Dana Fox',
      guestEmail: 'dana@example.com',
      startTime: `${MONDAY}T10:00:00.000Z`,
    });
    const res = await request(app).patch(`/api/slots/${created.body.id}`).send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('frees the slot after cancellation', async () => {
    const created = await request(app).post('/api/slots').send({
      eventTypeId: 'et-2',
      guestName: 'Dana Fox',
      guestEmail: 'dana@example.com',
      startTime: `${MONDAY}T10:00:00.000Z`,
    });
    await request(app).patch(`/api/slots/${created.body.id}`).send({ status: 'cancelled' });
    const res = await request(app).get(`/api/owners/owner-1/free-slots?date=${MONDAY}&eventTypeId=et-2`);
    expect(res.body).toHaveLength(35);
  });

  it('returns 404 for an unknown slot', async () => {
    const res = await request(app).patch('/api/slots/nope').send({ status: 'cancelled' });
    expect(res.status).toBe(404);
  });

  it('rejects an unsupported status', async () => {
    const res = await request(app).patch('/api/slots/s1').send({ status: 'confirmed' });
    expect(res.status).toBe(422);
  });
});
