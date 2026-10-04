const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;

export function formatAge(fromIso: string, now: Date): string {
  const elapsedMs = Math.max(0, now.getTime() - Date.parse(fromIso));
  const minutes = Math.floor(elapsedMs / MS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) return `${minutes}m`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `${hours}h`;
  const days = Math.floor(hours / HOURS_PER_DAY);
  if (days < DAYS_PER_WEEK) return `${days}d`;
  return `${Math.floor(days / DAYS_PER_WEEK)}w`;
}

export function countOf(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
