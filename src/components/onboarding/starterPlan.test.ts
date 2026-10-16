import { describe, expect, it } from 'vitest';
import { trainingPlanSchema, isTrainingSlot } from '@/domain/plan';
import { legacyProfile, LEGACY_PHASES } from '@/domain/plans/legacy';
import { targetDateFor } from '@/domain/onboarding';
import type { UserProfile } from '@/domain/profile';
import { loadCatalog } from '@/domain/catalog';
import { createBuiltinPlan, scalePhases, weeklyFor } from './starterPlan';

const START = '2026-10-17';

function profile(days: number, daysPerWeek = 3, overrides: Partial<UserProfile> = {}) {
  return {
    ...legacyProfile(START, '2026-10-16', 'now'),
    targetDate: targetDateFor(START, days),
    daysPerWeek,
    ...overrides,
  };
}

describe('createBuiltinPlan (stub until the W2 generator lands)', () => {
  it.each([28, 84, 180, 365])('runs a valid plan to the target date (%i days)', (days) => {
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

  it('only uses moves the user has equipment for', () => {
    const equipmentById = new Map(loadCatalog().exercises.map((e) => [e.id, e.equipment]));
    for (const equipment of [['bodyweight'], ['band'], ['dumbbell']] as const) {
      const plan = createBuiltinPlan(
        profile(84, 3, { equipment: [...equipment] }),
        'easy',
        START,
        'now',
      );
      expect(trainingPlanSchema.parse(plan)).toBeTruthy();
      const used = plan.sessions.flatMap((s) =>
        s.exercises.map((e) => equipmentById.get(e.catalogId!)),
      );
      expect(used.length).toBeGreaterThan(0);
      for (const eq of used) expect([...equipment, 'bodyweight']).toContain(eq);
    }
  });

  it('keeps knee notes only for a knee injury', () => {
    const knee = createBuiltinPlan(profile(84), 'easy', START, 'now');
    const none = createBuiltinPlan(profile(84, 3, { injuries: [] }), 'easy', START, 'now');
    expect(knee.sessions.some((s) => s.note?.includes('knee'))).toBe(true);
    expect(none.sessions.every((s) => s.note === undefined)).toBe(true);
  });

  it('schedules every session it includes', () => {
    for (const days of [1, 2, 3, 4, 5, 6]) {
      const plan = createBuiltinPlan(profile(84, days), 'intermediate', START, 'now');
      const scheduled = new Set(Object.values(plan.weekly));
      for (const s of plan.sessions) expect(scheduled).toContain(s.id);
    }
  });
});
