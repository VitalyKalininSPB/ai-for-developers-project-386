import { test, expect } from '@playwright/test';

const OWNER_ID = 'owner-1';
const EVENT_TYPE_ID = 'et-1';

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextWeekday(target) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== target) d.setDate(d.getDate() + 1);
  return toDateStr(d);
}

async function clearDate(request, date) {
  const res = await request.get(`/api/owners/${OWNER_ID}/slots?date=${date}`);
  const slots = await res.json();
  for (const s of slots) {
    if (s.status === 'confirmed') {
      await request.patch(`/api/slots/${s.id}`, { data: { status: 'cancelled' } });
    }
  }
}

async function bookFirstFreeSlot(request, date, eventTypeId = EVENT_TYPE_ID, name = 'Test User', email = 'test@example.com') {
  const res = await request.get(`/api/owners/${OWNER_ID}/free-slots?date=${date}&eventTypeId=${eventTypeId}`);
  const free = await res.json();
  const slot = free[0];
  const created = await request.post('/api/slots', {
    data: { eventTypeId, guestName: name, guestEmail: email, startTime: slot.startTime },
  });
  return created.json();
}

test('loads event types and shows free slots', async ({ page }) => {
  await page.goto('/');

  const select = page.locator('select');
  await expect(select.locator('option')).toHaveCount(4);
  await expect(select).toHaveValue(EVENT_TYPE_ID);
  await expect(select).toHaveText(/Quick Chat/);

  await page.locator('input[type=date]').fill(nextWeekday(1));
  await expect(page.locator('.slot-btn').first()).toBeVisible();
});

test('books a slot from the UI', async ({ page, request }) => {
  const date = nextWeekday(1);
  await clearDate(request, date);

  await page.goto('/');
  await page.locator('input[type=date]').fill(date);

  const slots = page.locator('.slot-btn');
  await expect(slots.first()).toBeVisible();
  const before = await slots.count();

  await slots.first().click();
  await expect(page.locator('.modal')).toBeVisible();
  await page.locator('.modal input[type=text]').fill('UI Booked Guest');
  await page.locator('.modal input[type=email]').fill('ui@example.com');
  await page.locator('.modal .btn-primary').click();

  await expect(page.locator('.modal')).toHaveCount(0);
  await expect(slots).not.toHaveCount(before);
  await expect(page.locator('.badge.confirmed')).toHaveCount(1);
});

test('cancels a booking and frees the slot', async ({ page, request }) => {
  const date = nextWeekday(1);
  await clearDate(request, date);
  const slot = await bookFirstFreeSlot(request, date);

  await page.goto('/');
  await page.locator('input[type=date]').fill(date);
  await expect(page.locator('.badge.confirmed')).toHaveCount(1);

  const startLabel = slot.startTime.slice(11, 16);
  await page.locator('.btn-small', { hasText: 'Cancel' }).click();

  await expect(page.locator('.badge.confirmed')).toHaveCount(0);
  await expect(page.locator('.slot-btn', { hasText: startLabel })).toBeVisible();

  const res = await request.get(`/api/owners/${OWNER_ID}/slots?date=${date}`);
  const updated = (await res.json()).find(s => s.id === slot.id);
  expect(updated.status).toBe('cancelled');
});

test('switches event type and updates free slots', async ({ page, request }) => {
  const date = nextWeekday(1);
  await clearDate(request, date);

  await page.goto('/');
  await page.locator('input[type=date]').fill(date);

  const slots = page.locator('.slot-btn');
  await expect(slots.first()).toBeVisible();
  const count15 = await slots.count();
  await expect(slots.first()).toHaveText(/09:00 – 09:15/);

  await page.locator('select').selectOption('et-2');
  await expect(slots.first()).toHaveText(/09:00 – 09:30/);
  const count30 = await slots.count();
  expect(count30).toBeLessThan(count15);
});

test('shows no slots on a non-working day', async ({ page }) => {
  const date = nextWeekday(0);

  await page.goto('/');
  await page.locator('input[type=date]').fill(date);

  await expect(page.locator('.slot-btn')).toHaveCount(0);
  await expect(page.getByText('No free slots available')).toBeVisible();
  await expect(page.getByText('No bookings for this day')).toBeVisible();
});

test('double booking shows conflict error', async ({ browser, request }) => {
  const date = nextWeekday(1);
  await clearDate(request, date);

  const context = await browser.newContext();
  const page1 = await context.newPage();
  const page2 = await context.newPage();

  await page1.goto('/');
  await page2.goto('/');
  await page1.locator('input[type=date]').fill(date);
  await page2.locator('input[type=date]').fill(date);
  await expect(page1.locator('.slot-btn').first()).toBeVisible();
  await expect(page2.locator('.slot-btn').first()).toBeVisible();

  await page1.locator('.slot-btn').first().click();
  await page1.locator('.modal input[type=text]').fill('Alice');
  await page1.locator('.modal input[type=email]').fill('alice@example.com');
  await page1.locator('.modal .btn-primary').click();
  await expect(page1.locator('.modal')).toHaveCount(0);

  await page2.locator('.slot-btn').first().click();
  await page2.locator('.modal input[type=text]').fill('Bob');
  await page2.locator('.modal input[type=email]').fill('bob@example.com');
  await page2.locator('.modal .btn-primary').click();

  await expect(page2.locator('.error')).toHaveText('This slot is already booked');
  await context.close();
});
