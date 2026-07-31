import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = InstanceType<typeof Database>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS owners (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  timezone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS working_hours (
  owner_id    TEXT NOT NULL REFERENCES owners(id),
  day_of_week TEXT NOT NULL,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  PRIMARY KEY (owner_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS event_types (
  id             TEXT PRIMARY KEY,
  owner_id       TEXT NOT NULL REFERENCES owners(id),
  name           TEXT NOT NULL,
  duration       INTEGER NOT NULL,
  description    TEXT,
  buffer_minutes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS guests (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS slots (
  id           TEXT PRIMARY KEY,
  event_type_id TEXT NOT NULL REFERENCES event_types(id),
  guest_id     TEXT NOT NULL REFERENCES guests(id),
  start_time   TEXT NOT NULL,
  end_time     TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_slots_start ON slots(start_time);
CREATE INDEX IF NOT EXISTS idx_slots_status ON slots(status);
`;

export function migrate(db: Db): void {
  db.exec(SCHEMA);
}

const OWNER = {
  id: 'owner-1',
  name: 'Alice Johnson',
  timezone: 'Europe/Moscow',
  workingHours: [
    { dayOfWeek: 'Monday', startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 'Friday', startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 'Saturday', startTime: '10:00', endTime: '16:00' },
  ],
};

const EVENT_TYPES = [
  { id: 'et-1', name: 'Quick Chat', duration: 15, bufferMinutes: 5, description: 'Brief check-in' },
  { id: 'et-2', name: '30-min Meeting', duration: 30, bufferMinutes: 0, description: 'Standard call' },
  { id: 'et-3', name: '1-hour Workshop', duration: 60, bufferMinutes: 10, description: 'Deep dive session' },
];

const GUESTS = [
  { id: 'guest-1', name: 'Bob Smith', email: 'bob@example.com' },
  { id: 'guest-2', name: 'Carol Lee', email: 'carol@example.com' },
];

function toIso(dateStr: string, minutes: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCMinutes(minutes);
  return d.toISOString();
}

function seedSlots(db: Db): void {
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const slots = [
    {
      id: 'slot-1',
      eventTypeId: 'et-2',
      guestId: 'guest-1',
      startTime: toIso(today, 7 * 60),
      endTime: toIso(today, 7 * 60 + 30),
      status: 'confirmed',
      createdAt: nowIso,
    },
    {
      id: 'slot-2',
      eventTypeId: 'et-1',
      guestId: 'guest-2',
      startTime: toIso(today, 11 * 60),
      endTime: toIso(today, 11 * 60 + 15),
      status: 'confirmed',
      createdAt: nowIso,
    },
  ];

  const insertSlot = db.prepare(
    `INSERT OR IGNORE INTO slots (id, event_type_id, guest_id, start_time, end_time, status, created_at)
     VALUES (@id, @eventTypeId, @guestId, @startTime, @endTime, @status, @createdAt)`,
  );
  for (const slot of slots) insertSlot.run(slot);
}

export function seed(db: Db): void {
  const insertOwner = db.prepare('INSERT OR IGNORE INTO owners (id, name, timezone) VALUES (?, ?, ?)');
  insertOwner.run(OWNER.id, OWNER.name, OWNER.timezone);

  const insertWh = db.prepare(
    'INSERT OR IGNORE INTO working_hours (owner_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
  );
  for (const wh of OWNER.workingHours) {
    insertWh.run(OWNER.id, wh.dayOfWeek, wh.startTime, wh.endTime);
  }

  const insertEventType = db.prepare(
    `INSERT OR IGNORE INTO event_types (id, owner_id, name, duration, description, buffer_minutes)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const et of EVENT_TYPES) {
    insertEventType.run(et.id, OWNER.id, et.name, et.duration, et.description, et.bufferMinutes);
  }

  const insertGuest = db.prepare('INSERT OR IGNORE INTO guests (id, name, email) VALUES (?, ?, ?)');
  for (const g of GUESTS) insertGuest.run(g.id, g.name, g.email);

  seedSlots(db);
}

export function openDatabase(filename: string): Db {
  if (filename !== ':memory:') {
    mkdirSync(dirname(filename), { recursive: true });
  }
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  seed(db);
  return db;
}
