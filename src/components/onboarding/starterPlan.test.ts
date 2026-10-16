import { describe, expect, it } from 'vitest';
import { trainingPlanSchema, isTrainingSlot } from '@/domain/plan';
import { legacyProfile, LEGACY_PHASES } from '@/domain/plans/legacy';
import { targetDateFor } from '@/domain/onboarding';
import { createBuiltinPlan, scalePhases, weeklyFor } from './starterPlan';

const START = '2026-10-17';

function profile(days: number, daysPerWeek = 3) {
  return {
    ...legacyProfile(START, '2026-10-16', 'now'),
    targetDate: targetDateFor(START, days),
    daysPerWeek,
  };
}

describe('createBuiltinPlan (stub until the W2 generator lands)', () => {
  it.each([28, 84, 180, 365, 730])('runs a valid plan to the target date (%i days)', (days) => {
    const plan = createBuiltinPlan(profile(days), 'intermediate', START, 'now');
    expect(trainingPlanSchema.parse(plan)).toBeTruthy();
    expect(plan.totalDays).toBe(days);
    expect(plan.phases.at(-1)!.endDay).toBe(days);
  });

  it('keeps the original phases for a 180-day intermediate plan', () => {
    const plan = createBuiltinPlan(profile(180), 'intermediate', START, 'now');
    expect(plan.phases).toEqual(LEGACY_PHASES);
    expect(plan.source).toBe('builtin-intermediate');
  });

  it('eases rounds and rest by level', () => {
    const easy = createBuiltinPlan(profile(180), 'easy', START, 'now');
    const hard = createBuiltinPlan(profile(180), 'hard', START, 'now');
    LEGACY_PHASES.forEach((p, i) => {
      expect(easy.phases[i].rounds).toBe(Math.max(1, p.rounds - 1));
      expect(hard.phases[i].rounds).toBe(p.rounds + 1);
      expect(hard.phases[i].rest).toBeLessThanOrEqual(p.rest);
    });
  });

  it.each([2, 3, 4, 5, 6])('trains on %i weekdays', (n) => {
    const weekly = weeklyFor(n, ['A', 'B', 'C']);
    expect(Object.values(weekly).filter(isTrainingSlot)).toHaveLength(n);
    expect(weekly.sun).toBe(n === 7 ? 'A' : 'rest');
  });

  it('tiles phases even when the plan is shorter than the phase count', () => {
    const phases = scalePhases(LEGACY_PHASES, 4);
    expect(phases).toHaveLength(4);
    expect(phases.map((p) => [p.startDay, p.endDay])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
  });
});
