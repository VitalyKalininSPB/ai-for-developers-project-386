const BASE_URL = '/api';

export async function getEventTypes(ownerId) {
  const res = await fetch(`${BASE_URL}/owners/${ownerId}/event-types`);
  if (!res.ok) throw new Error('Failed to load event types');
  return res.json();
}

export async function getFreeSlots(ownerId, date, eventTypeId) {
  const params = new URLSearchParams({ date, eventTypeId });
  const res = await fetch(`${BASE_URL}/owners/${ownerId}/free-slots?${params}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error('Failed to load free slots');
  return res.json();
}

export async function getOwnerSlots(ownerId, date) {
  const params = new URLSearchParams({ date });
  const res = await fetch(`${BASE_URL}/owners/${ownerId}/slots?${params}`);
  if (!res.ok) throw new Error('Failed to load bookings');
  return res.json();
}

export async function createSlot({ eventTypeId, guestName, guestEmail, startTime }) {
  const res = await fetch(`${BASE_URL}/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventTypeId, guestName, guestEmail, startTime }),
  });
  if (res.status === 409) throw new Error('This slot is already booked');
  if (res.status === 422) throw new Error('Invalid time slot');
  if (!res.ok) throw new Error('Failed to create booking');
  return res.json();
}

export async function cancelSlot(slotId) {
  const res = await fetch(`${BASE_URL}/slots/${slotId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  if (!res.ok) throw new Error('Failed to cancel booking');
  return res.json();
}
