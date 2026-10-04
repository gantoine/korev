import { MINUTE_MS, SECOND_MS } from './useNow';

const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
const SECONDS_PER_MINUTE = 60;

const AGE_UNITS: { size: number; suffix: string }[] = [
  { size: DAY_MS, suffix: 'd' },
  { size: HOUR_MS, suffix: 'h' },
  { size: MINUTE_MS, suffix: 'm' },
];

const CLOCK_FORMAT: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};

const WEEKDAY_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'short' };

export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function formatCount(count: number): string {
  return count.toLocaleString();
}

export function joinMeta(parts: (string | null)[]): string {
  return parts.filter(Boolean).join(' · ');
}

export function formatAge(iso: string, now: number): string {
  const elapsed = Math.max(0, now - Date.parse(iso));
  const unit = AGE_UNITS.find(({ size }) => elapsed >= size);
  if (!unit) return '<1m';
  return `${Math.floor(elapsed / unit.size)}${unit.suffix}`;
}

export function formatSynced(iso: string, now: number): string {
  if (now - Date.parse(iso) < MINUTE_MS) return 'Synced just now';
  return `Synced ${formatAge(iso, now)} ago`;
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], CLOCK_FORMAT);
}

export function formatWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString([], WEEKDAY_FORMAT);
}

function isSameDay(iso: string, now: number): boolean {
  return new Date(iso).toDateString() === new Date(now).toDateString();
}

export function formatDataTime(iso: string, now: number): string {
  const clock = formatClock(iso);
  return isSameDay(iso, now) ? clock : `${formatWeekday(iso)} ${clock}`;
}

export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / SECOND_MS));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
