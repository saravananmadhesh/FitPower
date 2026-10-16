import type { CatalogExercise, Difficulty, Equipment } from './catalog';
import { buildTimerPlan } from './program';
import {
  isTrainingSlot,
  trainingPlanSchema,
  WEEKDAYS,
  type PlanPhase,
  type PlanSession,
  type TrainingPlan,
} from './plan';
import type { Injury, UserProfile } from './profile';

/**
 * Safety and fit rules for a training plan against a user's profile. The
 * built-in generator only picks exercises these rules allow, and the AI coach
 * runs `checkPlan` on every plan it proposes, so both paths obey one rule set.
 */

export const PLAN_LEVELS = ['easy', 'intermediate', 'hard'] as const;
export type PlanLevel = (typeof PLAN_LEVELS)[number];

const DIFFICULTY_RANK: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** Hardest catalog difficulty each built-in level may use. */
export const LEVEL_MAX_DIFFICULTY: Record<PlanLevel, Difficulty> = {
  easy: 'beginner',
  intermediate: 'intermediate',
  hard: 'advanced',
};

export type InjuryArea = Injury['area'];

export interface RuleContext {
  /** What the user owns. Bodyweight is always available. */
  equipment: ReadonlySet<Equipment>;
  injuries: ReadonlySet<InjuryArea>;
  /** Built-in level, when generating; the AI path leaves it unset. */
  level?: PlanLevel;
}

export function ruleContextFor(profile: UserProfile, level?: PlanLevel): RuleContext {
  return {
    equipment: new Set<Equipment>([...profile.equipment, 'bodyweight']),
    injuries: new Set(profile.injuries.map((i) => i.area)),
    level,
  };
}

export type ExclusionReason =
  'equipment' | 'bench' | 'difficulty' | 'knee' | 'back' | 'shoulder' | 'wrist';

type ExerciseFacts = Pick<
  CatalogExercise,
  'id' | 'equipment' | 'needsBench' | 'difficulty' | 'knee' | 'album' | 'subAlbum' | 'mechanic'
> & { primaryMuscles: readonly string[] };

/** Loaded spinal flexion/extension, bent-over pulls and ballistic full-body lifts. */
const BACK_RISK =
  /Bent_Over|Renegade|Good_Morning|Stiff-Legged|Single_Leg_RDL|Hip_Hinge|Russian_Twist|Windmill|Swing|Man_Maker|Turkish|Superman|Band_Deadlift/;
/** Overhead pressing, upright rows and end-range shoulder positions. */
const SHOULDER_RISK =
  /Upright_Row|Push_Press|Thruster|Snatch|Turkish|Squat_To_Press|Dip|Pullover|Overhead|Skull|Halo|Iron_Cross|Assisted_Pull_Up|Cuban|Man_Maker|Y_Raise|Clean/;
/** Loaded wrist flexion/extension and weight on extended wrists. */
const WRIST_RISK = /Wrist|Pronation|Supination|Renegade|Dip|Clean|Snatch|Man_Maker/;

/**
 * Why an exercise can't go in this user's plan, or null when it can.
 * Knee uses the catalog's `knee` flag (Easy also drops "caution" moves);
 * other injuries use movement families, since the catalog has no flag for them.
 */
export function exclusionReason(ex: ExerciseFacts, ctx: RuleContext): ExclusionReason | null {
  if (!ctx.equipment.has(ex.equipment)) return 'equipment';
  // Home kit is dumbbells + bands; no bench is assumed.
  if (ex.needsBench) return 'bench';
  if (
    ctx.level &&
    DIFFICULTY_RANK[ex.difficulty] > DIFFICULTY_RANK[LEVEL_MAX_DIFFICULTY[ctx.level]]
  )
    return 'difficulty';
  if (ctx.injuries.has('knee')) {
    if (ex.knee === 'avoid') return 'knee';
    if (ex.knee === 'caution' && ctx.level === 'easy') return 'knee';
  }
  if (
    ctx.injuries.has('back') &&
    (ex.album === 'full-body' || ex.primaryMuscles.includes('lower back') || BACK_RISK.test(ex.id))
  )
    return 'back';
  if (
    ctx.injuries.has('shoulder') &&
    ((ex.album === 'shoulders' && ex.subAlbum === 'front-delts' && ex.mechanic === 'compound') ||
      SHOULDER_RISK.test(ex.id))
  )
    return 'shoulder';
  if (ctx.injuries.has('wrist') && (ex.subAlbum === 'push-up' || WRIST_RISK.test(ex.id)))
    return 'wrist';
  return null;
}

/** A knee "caution" move kept for someone with a knee injury: it needs a partial-range note. */
export function needsKneeCaution(ex: Pick<CatalogExercise, 'knee'>, ctx: RuleContext): boolean {
  return ctx.injuries.has('knee') && ex.knee === 'caution';
}

/** Estimated minutes for one session in a phase: warm-up, rounds, round rests, cooldown. */
export function estimateSessionMinutes(
  session: Pick<PlanSession, 'exercises'>,
  phase: Pick<PlanPhase, 'work' | 'rest' | 'rounds'>,
): number {
  const seconds = buildTimerPlan(session.exercises, phase).reduce((sum, s) => sum + s.seconds, 0);
  return Math.round(seconds / 60);
}

/** The longest any session in the plan runs, across all phases. */
export function longestSessionMinutes(plan: TrainingPlan): number {
  let max = 0;
  for (const session of plan.sessions) {
    for (const phase of plan.phases) max = Math.max(max, estimateSessionMinutes(session, phase));
  }
  return max;
}

export function trainingDaysPerWeek(plan: Pick<TrainingPlan, 'weekly'>): number {
  return WEEKDAYS.filter((d) => isTrainingSlot(plan.weekly[d])).length;
}

export type PlanIssueCode =
  | 'schema'
  | 'unknown-exercise'
  | `excluded-${ExclusionReason}`
  | 'no-catalog-link'
  | 'too-many-days'
  | 'session-too-long';

export interface PlanIssue {
  code: PlanIssueCode;
  /** Errors make a plan unsafe or invalid; warnings are a poor fit worth fixing. */
  severity: 'error' | 'warning';
  /** Plain-English detail, written for the AI coach to read and correct. */
  message: string;
  path: (string | number)[];
}

/** Sessions longer than this × the user's minutes are flagged. */
const LENGTH_TOLERANCE = 1.25;

/**
 * Every problem with `plan` for this user: schema errors, exercises that are
 * not in the catalog or break the equipment/injury rules, more training days
 * than the user has, and sessions that run well past their time budget.
 * An empty list means the plan is safe to save.
 */
export function checkPlan(
  plan: unknown,
  profile: UserProfile,
  catalog: readonly CatalogExercise[],
): PlanIssue[] {
  const parsed = trainingPlanSchema.safeParse(plan);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      code: 'schema' as const,
      severity: 'error' as const,
      message: issue.message,
      path: issue.path.filter((p): p is string | number => typeof p !== 'symbol'),
    }));
  }

  const valid = parsed.data;
  const byId = new Map(catalog.map((ex) => [ex.id, ex]));
  const ctx = ruleContextFor(profile);
  const issues: PlanIssue[] = [];

  valid.sessions.forEach((session, si) => {
    session.exercises.forEach((ex, ei) => {
      const path = ['sessions', si, 'exercises', ei];
      if (!ex.catalogId) {
        issues.push({
          code: 'no-catalog-link',
          severity: 'warning',
          message: `"${ex.name}" has no catalogId, so it has no gallery demo or video link`,
          path,
        });
        return;
      }
      const match = byId.get(ex.catalogId);
      if (!match) {
        issues.push({
          code: 'unknown-exercise',
          severity: 'error',
          message: `catalogId "${ex.catalogId}" is not in the exercise catalog`,
          path,
        });
        return;
      }
      const reason = exclusionReason(match, ctx);
      if (reason) {
        issues.push({
          code: `excluded-${reason}`,
          severity: 'error',
          message: `"${match.name}" is not allowed for this user (${reason})`,
          path,
        });
      }
    });
  });

  const days = trainingDaysPerWeek(valid);
  if (days > profile.daysPerWeek) {
    issues.push({
      code: 'too-many-days',
      severity: 'warning',
      message: `plan trains ${days} days a week but the user has ${profile.daysPerWeek}`,
      path: ['weekly'],
    });
  }

  valid.sessions.forEach((session, si) => {
    const minutes = Math.max(...valid.phases.map((p) => estimateSessionMinutes(session, p)));
    if (minutes > profile.minutesPerSession * LENGTH_TOLERANCE) {
      issues.push({
        code: 'session-too-long',
        severity: 'warning',
        message: `session "${session.id}" runs about ${minutes} min; the user has ${profile.minutesPerSession}`,
        path: ['sessions', si],
      });
    }
  });

  return issues;
}
