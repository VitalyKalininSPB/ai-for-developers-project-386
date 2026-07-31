const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getDayName(dateStr: string): string {
  return DAYS[new Date(dateStr + 'T12:00:00').getDay()];
}

export function toMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function toIso(dateStr: string, minutes: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCMinutes(minutes);
  return d.toISOString();
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const TIME_RE = /^\d{2}:\d{2}$/;

export function minutesOfDay(iso: string): number {
  return toMin(iso.slice(11, 16));
}
