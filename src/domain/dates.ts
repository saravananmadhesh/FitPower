import { addDays as addDaysFns, format } from 'date-fns';

/**
 * Parses a "YYYY-MM-DD" key into a local-midnight Date — matches v1's
 * `parseISO` (`new Date(+y, +m-1, +d)`).
 */
export function parseISO(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Formats a Date as a "YYYY-MM-DD" key using LOCAL calendar fields.
 * v1's equivalent (`iso()`) used `toISOString()`, which is UTC-based and
 * silently shifts the date by one day for any positive UTC-offset user
 * (e.g. IST) between local midnight and UTC midnight (00:00-05:30 IST).
 * Fixed here — date-fns `format` is in the stack for exactly this.
 */
export function formatISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayISO(): string {
  return formatISO(new Date());
}

export function addDays(date: Date, amount: number): Date {
  return addDaysFns(date, amount);
}

/** 1-based day within the program. Day 1 = startDate. */
export function dayNumber(startDate: string, today: string): number {
  const start = parseISO(startDate);
  const now = parseISO(today);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function daysBetween(a: string, b: string): number {
  return Math.floor((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}
