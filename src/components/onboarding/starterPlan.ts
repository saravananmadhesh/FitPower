import { legacyPlan } from '@/domain/plans/legacy';
import { planLengthDays, type PlanLevel } from '@/domain/onboarding';
import { REST_DAY, WALK_DAY, WEEKDAYS, type PlanPhase, type TrainingPlan } from '@/domain/plan';
import { hasInjury, type UserProfile } from '@/domain/profile';
import { findByProgramName, loadCatalog } from '@/domain/catalog';
import type { PlanExercise, PlanSession } from '@/domain/plan';

/**
 * Stand-in for the built-in plan generator (release-plan W2,
 * `domain/planGenerator.ts`). When `generatePlan(profile, level, startDate)`
 * lands, `createBuiltinPlan` should call it and this file's helpers go away;
 * the wizard only depends on `createBuiltinPlan`.
 *
 * Until then it takes the original program and fits it to the profile: the
 * phases are stretched to end on the target date, sessions land on as many
 * weekdays as the user picked, moves needing equipment the user lacks are
 * swapped (or dropped), knee notes only stay for a knee injury, and the level
 * nudges rounds and rest. Imports the catalog, so only lazy routes may use it.
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

/**
 * Keeps each move the user can do with their equipment: the move itself, else
 * the first listed swap the catalog says they can do, else nothing.
 */
export function fitToEquipment(
  sessions: PlanSession[],
  substitutions: Record<string, string[]>,
  equipment: UserProfile['equipment'],
): PlanSession[] {
  const equipmentById = new Map(loadCatalog().exercises.map((e) => [e.id, e.equipment]));
  // Bodyweight moves need nothing, so they are always available.
  const allowed = new Set<string>([...equipment, 'bodyweight']);
  const fits = (ex: PlanExercise): PlanExercise | null => {
    const own = ex.catalogId ? equipmentById.get(ex.catalogId) : undefined;
    if (own && allowed.has(own)) return ex;
    for (const alt of substitutions[ex.name] ?? []) {
      const match = findByProgramName(alt);
      if (match && allowed.has(match.equipment)) {
        return { ...ex, name: alt, catalogId: match.id };
      }
    }
    return null;
  };
  return sessions
    .map((s) => {
      const seen = new Set<string>();
      const exercises = s.exercises
        .map(fits)
        .filter(
          (ex): ex is PlanExercise => ex !== null && !seen.has(ex.name) && !!seen.add(ex.name),
        );
      return { ...s, exercises };
    })
    .filter((s) => s.exercises.length > 0);
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
  const knee = hasInjury(profile, 'knee');
  const sessions = fitToEquipment(base.sessions, base.substitutions, profile.equipment)
    // Fewer training days than sessions: drop the extras rather than never schedule them.
    .slice(0, Math.max(1, profile.daysPerWeek))
    // The legacy session notes were written for a knee injury.
    .map(({ note, ...s }) => (knee && note ? { ...s, note } : s));
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
      sessions.map((s) => s.id),
    ),
    sessions,
    phases,
  };
}
