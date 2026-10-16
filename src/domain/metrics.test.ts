import { describe, expect, it } from 'vitest';
import { backupDue, getLastSet, missedCount, rollingAvg, streakCount, weekStats } from './metrics';
import { legacyPlan } from './plans/legacy';
import type { TrainingPlan } from './plan';

// Fixture: 2026-01-05 is a Monday. Lifting days are Mon(A)/Wed(B)/Fri(C);
// Tue/Thu/Sat/Sun are 'R' walk/step days that don't count toward streaks.
const START = '2026-01-05';

/** The legacy plan, cut to `totalDays` (one phase covering it). */
function planOf(totalDays: number): TrainingPlan {
  const plan = legacyPlan(START, 'test');
  return { ...plan, totalDays, phases: [{ ...plan.phases[0], endDay: totalDays }] };
}
const PLAN = planOf(10);

describe('streakCount (consecutive done lifting-days ending at/before today; today-not-done does not break)', () => {
  it('counts back through today when today is not yet done', () => {
    const done = {
      '2026-01-05': true, // Mon A
      '2026-01-07': true, // Wed B
      // 2026-01-09 (Fri C, "today") not done; Tue/Thu are step days (skipped)
    };
    expect(streakCount(PLAN, done, '2026-01-09')).toBe(2);
  });

  it('breaks at the first missed lifting day walking backward', () => {
    const done = {
      '2026-01-05': true, // Mon A
      // 2026-01-07 (Wed B) missed
      '2026-01-09': true, // Fri C
    };
    // today Mon 2026-01-12 (A) not done -> skip; Fri done (1); Wed missed -> break.
    expect(streakCount(PLAN, done, '2026-01-12')).toBe(1);
  });

  it('is zero when nothing is done', () => {
    expect(streakCount(PLAN, {}, '2026-01-09')).toBe(0);
  });
});

describe('weekStats (Mon-Sun non-rest completion; 3 lifting days/week)', () => {
  const done = {
    '2026-01-05': true, // Mon A
    '2026-01-07': true, // Wed B
    // 2026-01-09 Fri not done
  };

  it('counts done/total for the Mon-Sun week containing today', () => {
    expect(weekStats(PLAN, '2026-01-09', done)).toEqual({ done: 2, total: 3 });
  });

  it('resolves the same week whether "today" is mid-week or Sunday', () => {
    expect(weekStats(PLAN, '2026-01-11', done)).toEqual({ done: 2, total: 3 });
  });
});

describe('metrics follow the plan, not a fixed weekday map', () => {
  it('counts a Tue/Thu plan on its own training days', () => {
    const plan: TrainingPlan = {
      ...PLAN,
      weekly: { ...PLAN.weekly, mon: 'walk', tue: 'A', wed: 'walk', thu: 'B', fri: 'walk' },
    };
    const done = { '2026-01-06': true }; // Tue
    expect(weekStats(plan, '2026-01-09', done)).toEqual({ done: 1, total: 2 });
    expect(missedCount(plan, '2026-01-09', done)).toBe(1); // Thu 01-08 missed
    expect(streakCount(plan, { ...done, '2026-01-08': true }, '2026-01-09')).toBe(2);
  });
});

describe('missedCount (non-rest days strictly before today, not done)', () => {
  it('is zero when every prior lifting day is done', () => {
    const done = {
      '2026-01-05': true, // Mon A
      '2026-01-07': true, // Wed B
    };
    expect(missedCount(PLAN, '2026-01-09', done)).toBe(0);
  });

  it('counts a gap before today', () => {
    const done = {
      '2026-01-05': true, // Mon A
      // 2026-01-07 (Wed B) missed
    };
    expect(missedCount(PLAN, '2026-01-09', done)).toBe(1);
  });
});

describe('rollingAvg (v1 parity: 7-day trailing average over logged entries)', () => {
  it('matches v1 output for a 3-point series spanning >6 days', () => {
    const weights = [
      { date: '2026-01-01', kg: 80 },
      { date: '2026-01-03', kg: 79 },
      { date: '2026-01-08', kg: 78 },
    ];
    // pt1: [80] -> 80
    // pt2: within 6d of pt1 -> [80,79] -> 79.5
    // pt3: pt1 is 7d away (excluded), pt2 is 5d away (included) -> [79,78] -> 78.5
    expect(rollingAvg(weights)).toEqual([80, 79.5, 78.5]);
  });
});

describe('backupDue (v1 parity)', () => {
  it('is not due with no data yet', () => {
    expect(backupDue('2026-01-01', undefined, undefined, false)).toBe(false);
  });

  it('is due once there is data and no backup has ever been taken', () => {
    expect(backupDue('2026-01-01', undefined, undefined, true)).toBe(true);
  });

  it('is due 7+ days after the last backup', () => {
    expect(backupDue('2026-01-08', '2026-01-01', undefined, true)).toBe(true);
    expect(backupDue('2026-01-07', '2026-01-01', undefined, true)).toBe(false);
  });

  it('is suppressed while snoozed', () => {
    expect(backupDue('2026-01-08', '2026-01-01', '2026-01-10', true)).toBe(false);
    expect(backupDue('2026-01-11', '2026-01-01', '2026-01-10', true)).toBe(true);
  });
});

describe('getLastSet (v1 parity: most recent logged set for an exercise, excluding a date)', () => {
  it('finds the most recent prior entry, skipping the excluded date', () => {
    const sets = {
      '2026-01-05': { 'DB floor press': { w: 8, reps: 10 } },
      '2026-01-07': { 'DB floor press': { w: 9, reps: 10 } },
      '2026-01-09': { 'DB floor press': { w: 10, reps: 8 } }, // "today" — excluded
    };
    expect(getLastSet(sets, 'DB floor press', '2026-01-09')).toEqual({ w: 9, reps: 10 });
  });

  it('returns null when the exercise has never been logged', () => {
    expect(getLastSet({}, 'DB floor press', '2026-01-09')).toBeNull();
  });
});
