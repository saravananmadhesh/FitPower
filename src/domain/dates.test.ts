import { describe, expect, it } from 'vitest';
import { dayNumber, daysBetween, formatISO, parseISO } from './dates';

describe('dayNumber (v1 parity: floor((now-start)/86400000)+1)', () => {
  it.each([
    ['2026-01-01', '2026-01-01', 1],
    ['2026-01-01', '2026-01-10', 10],
    ['2026-01-01', '2025-12-31', 0],
    ['2026-08-25', '2026-08-24', 0], // "today" is day 0 when start is tomorrow
    ['2026-08-25', '2026-08-25', 1],
  ])('start=%s today=%s -> day %i', (start, today, expected) => {
    expect(dayNumber(start, today)).toBe(expected);
  });
});

describe('daysBetween', () => {
  it('counts whole days between two ISO dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7);
    expect(daysBetween('2026-01-08', '2026-01-01')).toBe(-7);
  });
});

describe('parseISO / formatISO round-trip', () => {
  it('round-trips a date key without UTC drift', () => {
    expect(formatISO(parseISO('2026-08-25'))).toBe('2026-08-25');
    expect(formatISO(parseISO('2026-01-01'))).toBe('2026-01-01');
    expect(formatISO(parseISO('2026-12-31'))).toBe('2026-12-31');
  });
});
