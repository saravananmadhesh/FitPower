import { describe, expect, it } from 'vitest';
import {
  dayTypeFor,
  isTrainingDay,
  phaseFor,
  sessionFor,
  trainingPlanSchema,
  type TrainingPlan,
} from './plan';
import { parseISO } from './dates';
import { LEGACY_TOTAL_DAYS, legacyPlan } from './plans/legacy';

const plan = legacyPlan('2026-08-24', 'test');

describe('dayTypeFor on the legacy plan (3-day full-body: Mon/Wed/Fri lift, rest walk/step days)', () => {
  // 2026-08-24 is a Monday.
  it.each([
    ['2026-08-24', 'A', true], // Mon — Full Body A
    ['2026-08-25', 'walk', false], // Tue — walk/steps
    ['2026-08-26', 'B', true], // Wed — Full Body B
    ['2026-08-27', 'walk', false], // Thu — walk/steps
    ['2026-08-28', 'C', true], // Fri — Full Body C
    ['2026-08-29', 'walk', false], // Sat — walk/steps
    ['2026-08-30', 'rest', false], // Sun — walk/rest
  ])('%s -> %s', (dateKey, expected, training) => {
    const d = parseISO(dateKey);
    expect(dayTypeFor(plan, d)).toBe(expected);
    expect(isTrainingDay(plan, d)).toBe(training);
  });

  it('resolves the scheduled session, or null on non-training days', () => {
    expect(sessionFor(plan, parseISO('2026-08-26'))?.id).toBe('B');
    expect(sessionFor(plan, parseISO('2026-08-30'))).toBeNull();
  });
});

describe('phaseFor on the legacy plan (v1 parity with phaseForDay)', () => {
  it.each([
    [1, 1],
    [30, 1],
    [31, 2],
    [60, 2],
    [61, 3],
    [90, 3],
    [91, 4],
    [120, 4],
    [121, 5],
    [150, 5],
    [151, 6],
    [180, 6],
    [200, 6], // clamped — v1 uses Math.min(6, ...)
    [0, 1], // before day 1 clamps to the first phase
  ])('day %i -> phase %i', (day, expected) => {
    expect(phaseFor(plan, day).n).toBe(expected);
  });
});

describe('trainingPlanSchema', () => {
  it('accepts the legacy plan', () => {
    expect(trainingPlanSchema.parse(plan)).toEqual(plan);
    expect(plan.totalDays).toBe(LEGACY_TOTAL_DAYS);
  });

  const invalid = (patch: Partial<TrainingPlan>): string[] => {
    const result = trainingPlanSchema.safeParse({ ...plan, ...patch });
    return result.success ? [] : result.error.issues.map((i) => i.message);
  };

  it('rejects a weekly slot naming an unknown session', () => {
    expect(invalid({ weekly: { ...plan.weekly, tue: 'Z' } })).toContain('unknown session "Z"');
  });

  it('rejects duplicate session ids', () => {
    expect(invalid({ sessions: [plan.sessions[0], plan.sessions[0]] })).toContain(
      'duplicate session id "A"',
    );
  });

  it('rejects phases that leave a gap or stop short of totalDays', () => {
    const [p1, p2] = plan.phases;
    expect(invalid({ phases: [p1, { ...p2, startDay: 32 }] }).join()).toMatch(
      /should start on day 31/,
    );
    expect(invalid({ phases: [p1] })).toContain('phases must end on day 180');
  });

  it('accepts any phase count and length that tiles the plan', () => {
    const phases = [
      { ...plan.phases[0], startDay: 1, endDay: 42 },
      { ...plan.phases[1], startDay: 43, endDay: 84 },
    ];
    expect(invalid({ totalDays: 84, phases })).toEqual([]);
  });
});
