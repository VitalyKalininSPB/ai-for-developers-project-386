import type { Db } from '../db.js';
import type { BookingStatus, CreateSlotInput, EventType, Guest, Slot, TimeInterval } from '../types.js';
import { DATE_RE, getDayName, minutesOfDay, toIso, toMin } from './time.js';
import { randomUUID } from 'node:crypto';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface BookedInterval {
  startMin: number;
  endMin: number;
  buffer: number;
}

interface SlotRow {
  id: string;
  eventTypeId: string;
  guestId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  createdAt: string;
}

function listEventTypes(db: Db, ownerId: string): EventType[] {
  return db
    .prepare(
      `SELECT id, owner_id AS ownerId, name, duration, description, buffer_minutes AS bufferMinutes
       FROM event_types WHERE owner_id = ? ORDER BY duration`,
    )
    .all(ownerId) as unknown as EventType[];
}

function getEventType(db: Db, eventTypeId: string): EventType | undefined {
  return db
    .prepare(
      `SELECT id, owner_id AS ownerId, name, duration, description, buffer_minutes AS bufferMinutes
       FROM event_types WHERE id = ?`,
    )
    .get(eventTypeId) as unknown as EventType | undefined;
}

function getWorkingHours(db: Db, ownerId: string, dayOfWeek: string): { startTime: string; endTime: string } | undefined {
  return db
    .prepare(
      `SELECT start_time AS startTime, end_time AS endTime
       FROM working_hours WHERE owner_id = ? AND day_of_week = ?`,
    )
    .get(ownerId, dayOfWeek) as { startTime: string; endTime: string } | undefined;
}

function listBookedIntervals(db: Db, date: string): BookedInterval[] {
  const rows = db
    .prepare(
      `SELECT s.start_time AS startTime, s.end_time AS endTime, e.buffer_minutes AS buffer
       FROM slots s JOIN event_types e ON e.id = s.event_type_id
       WHERE s.status = 'confirmed' AND substr(s.start_time, 1, 10) = ?`,
    )
    .all(date) as unknown as { startTime: string; endTime: string; buffer: number }[];
  return rows.map(r => ({
    startMin: minutesOfDay(r.startTime),
    endMin: minutesOfDay(r.endTime),
    buffer: r.buffer || 0,
  }));
}

function occupiesConflict(booked: BookedInterval[], startMin: number, endMin: number, buffer: number): boolean {
  return booked.some(b => startMin < b.endMin + b.buffer && endMin + buffer > b.startMin);
}

function requireOwner(db: Db, ownerId: string): void {
  const owner = db.prepare('SELECT id FROM owners WHERE id = ?').get(ownerId);
  if (!owner) throw new ApiError(404, 'Owner not found');
}

const SLOT_SELECT = `
  SELECT id, event_type_id AS eventTypeId, guest_id AS guestId,
         start_time AS startTime, end_time AS endTime, status, created_at AS createdAt
  FROM slots
`;

function toSlot(row: SlotRow): Slot {
  return { ...row, status: row.status };
}

export function listEventTypesForOwner(db: Db, ownerId: string): EventType[] {
  requireOwner(db, ownerId);
  return listEventTypes(db, ownerId);
}

export function listFreeSlots(db: Db, ownerId: string, date: string, eventTypeId: string): TimeInterval[] {
  if (!DATE_RE.test(date)) throw new ApiError(422, 'Invalid date format, expected YYYY-MM-DD');
  requireOwner(db, ownerId);

  const eventType = getEventType(db, eventTypeId);
  if (!eventType || eventType.ownerId !== ownerId) throw new ApiError(404, 'Event type not found');

  const wh = getWorkingHours(db, ownerId, getDayName(date));
  if (!wh) return [];

  const dayStart = toMin(wh.startTime);
  const dayEnd = toMin(wh.endTime);
  const duration = eventType.duration;
  const buffer = eventType.bufferMinutes || 0;
  const step = 15;
  const booked = listBookedIntervals(db, date);

  const free: TimeInterval[] = [];
  for (let start = dayStart; start + duration <= dayEnd; start += step) {
    const end = start + duration;
    if (!occupiesConflict(booked, start, end, buffer)) {
      free.push({ startTime: toIso(date, start), endTime: toIso(date, end) });
    }
  }
  return free;
}

export function listSlotsForOwner(db: Db, ownerId: string, date: string): Slot[] {
  if (!DATE_RE.test(date)) throw new ApiError(422, 'Invalid date format, expected YYYY-MM-DD');
  requireOwner(db, ownerId);
  const rows = db
    .prepare(`${SLOT_SELECT} WHERE substr(start_time, 1, 10) = ? ORDER BY start_time`)
    .all(date) as unknown as SlotRow[];
  return rows.map(toSlot);
}

export function createSlot(db: Db, input: CreateSlotInput): Slot {
  const { eventTypeId, guestName, guestEmail, startTime } = input;
  if (!eventTypeId || !guestName || !guestEmail || !startTime) {
    throw new ApiError(422, 'Missing required fields');
  }

  const eventType = getEventType(db, eventTypeId);
  if (!eventType) throw new ApiError(422, 'Invalid event type');

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) throw new ApiError(422, 'Invalid start time');

  const date = start.toISOString().slice(0, 10);
  const startMin = start.getUTCHours() * 60 + start.getUTCMinutes();
  const duration = eventType.duration;
  const buffer = eventType.bufferMinutes || 0;
  const endMin = startMin + duration;

  const wh = getWorkingHours(db, eventType.ownerId, getDayName(date));
  if (!wh) throw new ApiError(422, 'Owner is not working on this day');
  if (startMin < toMin(wh.startTime) || endMin > toMin(wh.endTime)) {
    throw new ApiError(422, 'Slot is outside working hours');
  }

  const booked = listBookedIntervals(db, date);
  if (occupiesConflict(booked, startMin, endMin, buffer)) {
    throw new ApiError(409, 'Slot is already occupied');
  }

  const guestId = 'guest-' + randomUUID().slice(0, 8);
  db.prepare('INSERT INTO guests (id, name, email) VALUES (?, ?, ?)').run(guestId, guestName, guestEmail);

  const slot: SlotRow = {
    id: 'slot-' + randomUUID().slice(0, 8),
    eventTypeId,
    guestId,
    startTime: start.toISOString(),
    endTime: new Date(start.getTime() + duration * 60000).toISOString(),
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO slots (id, event_type_id, guest_id, start_time, end_time, status, created_at)
     VALUES (@id, @eventTypeId, @guestId, @startTime, @endTime, @status, @createdAt)`,
  ).run(slot);

  return toSlot(slot);
}

export function cancelSlot(db: Db, slotId: string): Slot {
  const slot = db
    .prepare(`${SLOT_SELECT} WHERE id = ?`)
    .get(slotId) as unknown as SlotRow | undefined;
  if (!slot) throw new ApiError(404, 'Slot not found');
  db.prepare("UPDATE slots SET status = 'cancelled' WHERE id = ?").run(slotId);
  return { ...slot, status: 'cancelled' };
}

export function getGuest(db: Db, guestId: string): Guest | undefined {
  return db.prepare('SELECT id, name, email FROM guests WHERE id = ?').get(guestId) as Guest | undefined;
}
