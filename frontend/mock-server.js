import express from 'express';
import { randomUUID } from 'node:crypto';

const app = express();
app.use(express.json());

const PORT = 4010;

// ─── In-memory data ────────────────────────────────────────────────

const OWNER = {
  id: 'owner-1',
  name: 'Alice Johnson',
  timezone: 'Europe/Moscow',
  workingHours: [
    { dayOfWeek: 'Monday',    startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 'Tuesday',   startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 'Thursday',  startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 'Friday',    startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 'Saturday',  startTime: '10:00', endTime: '16:00' },
  ],
};

const EVENT_TYPES = [
  { id: 'et-1', ownerId: OWNER.id, name: 'Quick Chat',      duration: 15, bufferMinutes: 5,  description: 'Brief check-in' },
  { id: 'et-2', ownerId: OWNER.id, name: '30-min Meeting',  duration: 30, bufferMinutes: 0,  description: 'Standard call' },
  { id: 'et-3', ownerId: OWNER.id, name: '1-hour Workshop', duration: 60, bufferMinutes: 10, description: 'Deep dive session' },
];

const GUESTS = [
  { id: 'guest-1', name: 'Bob Smith',  email: 'bob@example.com' },
  { id: 'guest-2', name: 'Carol Lee',  email: 'carol@example.com' },
];

const slots = [
  {
    id: 'slot-1', eventTypeId: 'et-2', guestId: 'guest-1',
    startTime: '2026-07-30T10:00:00.000Z', endTime: '2026-07-30T10:30:00.000Z',
    status: 'confirmed', createdAt: new Date().toISOString(),
  },
];

// ─── Helpers ───────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getDayName(dateStr) {
  return DAYS[new Date(dateStr + 'T12:00:00').getDay()];
}

function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function toIso(dateStr, minutes) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCMinutes(minutes);
  return d.toISOString();
}

// ─── Routes ────────────────────────────────────────────────────────

app.get('/api/owners/:ownerId/event-types', (req, res) => {
  if (req.params.ownerId !== OWNER.id) return res.status(404).json({ error: 'Owner not found' });
  res.json(EVENT_TYPES);
});

app.get('/api/owners/:ownerId/free-slots', (req, res) => {
  const { ownerId } = req.params;
  if (ownerId !== OWNER.id) return res.status(404).json({ error: 'Owner not found' });

  const { date, eventTypeId } = req.query;
  const eventType = EVENT_TYPES.find(et => et.id === eventTypeId);
  if (!eventType) return res.status(404).json({ error: 'Event type not found' });

  const dayName = getDayName(date);
  const wh = OWNER.workingHours.find(w => w.dayOfWeek === dayName);
  if (!wh) return res.json([]);

  const dayStart = toMin(wh.startTime);
  const dayEnd = toMin(wh.endTime);
  const step = 15;
  const duration = eventType.duration;
  const buffer = eventType.bufferMinutes || 0;
  const slotWithBuffer = duration + buffer;

  const booked = slots
    .filter(s => s.status === 'confirmed' && s.startTime.startsWith(date))
    .map(s => ({ start: toMin(s.startTime.slice(11, 16)), end: toMin(s.endTime.slice(11, 16)) }));

  function overlaps(aStart, aEnd) {
    return booked.some(b => aStart < b.end && aEnd > b.start);
  }

  const free = [];
  let start = dayStart;
  while (start + duration <= dayEnd) {
    const end = start + duration;
    if (!overlaps(start, end)) {
      free.push({
        startTime: toIso(date, start),
        endTime: toIso(date, end),
      });
    }
    start += step;
    if (buffer > 0 && free.length && toMin(free.at(-1).endTime.slice(11, 16)) === end) {
      start += buffer - step;
    }
  }

  res.json(free);
});

app.get('/api/owners/:ownerId/slots', (req, res) => {
  if (req.params.ownerId !== OWNER.id) return res.status(404).json({ error: 'Owner not found' });
  const { date } = req.query;
  res.json(slots.filter(s => s.startTime.startsWith(date)));
});

app.post('/api/slots', (req, res) => {
  const { eventTypeId, guestName, guestEmail, startTime } = req.body;
  if (!eventTypeId || !guestName || !guestEmail || !startTime) {
    return res.status(422).json({ error: 'Missing required fields' });
  }

  const eventType = EVENT_TYPES.find(et => et.id === eventTypeId);
  if (!eventType) return res.status(422).json({ error: 'Invalid event type' });

  const start = new Date(startTime);
  const end = new Date(start.getTime() + eventType.duration * 60000);
  const isoStart = start.toISOString();

  const conflict = slots.some(
    s => s.status === 'confirmed' && new Date(s.startTime) < end && new Date(s.endTime) > start
  );
  if (conflict) return res.status(409).json({ error: 'Slot is already occupied' });

  const guestId = 'guest-' + randomUUID().slice(0, 8);
  const newSlot = {
    id: 'slot-' + randomUUID().slice(0, 8),
    eventTypeId,
    guestId,
    startTime: isoStart,
    endTime: end.toISOString(),
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  slots.push(newSlot);

  res.status(201).json(newSlot);
});

app.patch('/api/slots/:slotId', (req, res) => {
  const slot = slots.find(s => s.id === req.params.slotId);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  if (req.body.status === 'cancelled') slot.status = 'cancelled';
  res.json(slot);
});

// ─── Start ─────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Mock server running at http://localhost:${PORT}`);
});
