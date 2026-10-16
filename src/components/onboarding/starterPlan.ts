import { legacyPlan } from '@/domain/plans/legacy';
import { planLengthDays, type PlanLevel } from '@/domain/onboarding';
import { REST_DAY, WALK_DAY, WEEKDAYS, type PlanPhase, type TrainingPlan } from '@/domain/plan';
import type { UserProfile } from '@/domain/profile';

/**
 * Stand-in for the built-in plan generator (release-plan W2,
 * `domain/planGenerator.ts`). When `generatePlan(profile, level, startDate)`
 * lands, `createBuiltinPlan` should call it and this file's helpers go away;
 * the wizard only depends on `createBuiltinPlan`.
 *
 * Until then it takes the original program and fits it to the profile: the
 * phases are stretched to end on the target date, sessions land on as many
 * weekdays as the user picked, and the level nudges rounds and rest.
 */

/** Training weekdays for each "days per week" answer, Monday first. */
const TRAINING_DAYS: Record<number, (typeof WEEKDAYS)[number][]> = {
  1: ['mon'],
  2: ['mon', 'thu'],
  3: ['mon', 'wed', 'fri'],
  4: ['mon', 'tue', 'thu', 'fri'],
  5: ['mon', 'tue', 'wed', 'thu', 'fri'],
  6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  7: [...WEEKDAYS],
};

const LEVEL_TUNING: Record<PlanLevel, { rounds: number; restScale: number }> = {
  easy: { rounds: -1, restScale: 1.25 },
  intermediate: { rounds: 0, restScale: 1 },
  hard: { rounds: 1, restScale: 0.8 },
};

/** Weekday → session id, cycling the plan's sessions; Sunday rests when free. */
export function weeklyFor(daysPerWeek: number, sessionIds: string[]): TrainingPlan['weekly'] {
  const training = TRAINING_DAYS[Math.max(1, Math.min(7, daysPerWeek))];
  let next = 0;
  return Object.fromEntries(
    WEEKDAYS.map((day) => {
      if (training.includes(day)) return [day, sessionIds[next++ % sessionIds.length]];
      return [day, day === 'sun' ? REST_DAY : WALK_DAY];
    }),
  ) as TrainingPlan['weekly'];
}

/** Stretches or squeezes phases so they tile day 1 … totalDays, keeping their order. */
export function scalePhases(phases: PlanPhase[], totalDays: number): PlanPhase[] {
  const count = Math.min(phases.length, totalDays);
  const kept = phases.slice(0, count);
  let start = 1;
  return kept.map((p, i) => {
    const end = i === count - 1 ? totalDays : Math.round((totalDays * (i + 1)) / count);
    const phase = { ...p, n: i + 1, startDay: start, endDay: Math.max(start, end) };
    start = phase.endDay + 1;
    return phase;
  });
}

export function createBuiltinPlan(
  profile: UserProfile,
  level: PlanLevel,
  startDate: string,
  now: string = new Date().toISOString(),
): TrainingPlan {
  const base = legacyPlan(startDate, now);
  const totalDays = planLengthDays(startDate, profile.targetDate);
  const tuning = LEVEL_TUNING[level];
  const phases = scalePhases(base.phases, totalDays).map((p) => ({
    ...p,
    rounds: Math.max(1, Math.min(10, p.rounds + tuning.rounds)),
    rest: Math.round(p.rest * tuning.restScale),
  }));
  const names: Record<PlanLevel, string> = {
    easy: 'Easy',
    intermediate: 'Intermediate',
    hard: 'Hard',
  };
  return {
    ...base,
    source: `builtin-${level}`,
    name: `${names[level]} ${totalDays}-day plan`,
    totalDays,
    weekly: weeklyFor(
      profile.daysPerWeek,
      base.sessions.map((s) => s.id),
    ),
    phases,
  };
}
