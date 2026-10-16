import { loadCatalog, type CatalogExercise } from './catalog';
import { addDays, formatISO, parseISO } from './dates';
import type { PlanExercise, PlanPhase, PlanSession, TrainingPlan, Weekday } from './plan';
import { REST_DAY, WALK_DAY, WEEKDAYS } from './plan';
import {
  PLAN_LEVELS,
  estimateSessionMinutes,
  exclusionReason,
  needsKneeCaution,
  ruleContextFor,
  type PlanLevel,
  type RuleContext,
} from './planRules';
import type { UserProfile } from './profile';
import { EASY } from './plans/easy';
import { HARD } from './plans/hard';
import { INTERMEDIATE } from './plans/intermediate';
import type { LevelConfig, PhaseTemplate } from './plans/level';
import { PATTERNS, SPLITS, type MovementPattern, type SessionTemplate } from './plans/slots';

/**
 * Built-in plan generator: Easy, Intermediate and Hard plans built from the
 * user's profile with no AI. Pure apart from reading the bundled catalog, so
 * import it only from lazy routes (it pulls the catalog into that chunk).
 */

export { PLAN_LEVELS, type PlanLevel };

export const LEVELS: Record<PlanLevel, LevelConfig> = {
  easy: EASY,
  intermediate: INTERMEDIATE,
  hard: HARD,
};

export const DEFAULT_PLAN_DAYS = 180;
export const MIN_PLAN_DAYS = 28;
export const MAX_PLAN_DAYS = 365;
const DAYS_PER_PHASE = 30;
/** A session may run this much over the user's minutes before moves are dropped. */
const TIME_TOLERANCE = 1.1;
/** Never trim a session below this many exercises. */
const MIN_EXERCISES = 4;
const LEVEL_INDEX: Record<PlanLevel, 0 | 1 | 2> = { easy: 0, intermediate: 1, hard: 2 };
const DIFFICULTY_RANK = { beginner: 0, intermediate: 1, advanced: 2 } as const;

export function planSourceFor(level: PlanLevel): TrainingPlan['source'] {
  return `builtin-${level}`;
}

/** The built-in level a plan was generated at, or null for AI / legacy plans. */
export function levelOfPlan(plan: Pick<TrainingPlan, 'source'>): PlanLevel | null {
  const level = plan.source.replace(/^builtin-/, '');
  return (PLAN_LEVELS as readonly string[]).includes(level) ? (level as PlanLevel) : null;
}

/**
 * Plan length in days: start date through the profile's target date, clamped
 * to 28–365. A target date on or before the start gives the default 180.
 */
export function planLengthFor(profile: Pick<UserProfile, 'targetDate'>, startDate: string): number {
  const days =
    Math.round(
      (parseISO(profile.targetDate).getTime() - parseISO(startDate).getTime()) / 86_400_000,
    ) + 1;
  if (!Number.isFinite(days) || days <= 1) return DEFAULT_PLAN_DAYS;
  return Math.min(MAX_PLAN_DAYS, Math.max(MIN_PLAN_DAYS, days));
}

export type RecommendReason =
  | 'experience-beginner'
  | 'experience-intermediate'
  | 'experience-advanced'
  | 'low-health-rating'
  | 'health-not-cleared'
  | 'injury';

export interface LevelRecommendation {
  level: PlanLevel;
  /** Why, most important first; keys for `plans:recommend.reasons.*`. */
  reasons: RecommendReason[];
}

/**
 * Suggested level from experience, adjusted down for a low health rating, an
 * injury (never Hard) or a health condition not yet cleared by a doctor (Easy).
 */
export function recommendLevel(
  profile: Pick<UserProfile, 'experience' | 'healthRating' | 'injuries' | 'health'>,
): LevelRecommendation {
  const reasons: RecommendReason[] = [`experience-${profile.experience}`];
  let index: number = DIFFICULTY_RANK[profile.experience];

  if (profile.healthRating <= 2 && index > 0) {
    index -= 1;
    reasons.push('low-health-rating');
  }
  if (profile.injuries.length > 0 && index > 1) {
    index = 1;
    reasons.push('injury');
  }
  if (profile.health.conditions.trim() !== '' && !profile.health.clearedByDoctor && index > 0) {
    index = 0;
    reasons.push('health-not-cleared');
  }
  return { level: PLAN_LEVELS[index], reasons };
}

/** Phase templates for a plan of `totalDays`: about one per 30 days, up to the level's six. */
export function phasesFor(config: LevelConfig, totalDays: number): PlanPhase[] {
  const available = config.phases.length;
  const count = Math.max(1, Math.min(available, Math.round(totalDays / DAYS_PER_PHASE)));
  const picked: PhaseTemplate[] =
    count === 1
      ? [config.phases[0]]
      : Array.from(
          { length: count },
          (_, i) => config.phases[Math.round((i * (available - 1)) / (count - 1))],
        );

  // Split days evenly; any remainder goes to the later phases.
  const base = Math.floor(totalDays / count);
  const extra = totalDays % count;
  let start = 1;
  return picked.map((template, i) => {
    const length = base + (i >= count - extra ? 1 : 0);
    const phase: PlanPhase = { ...template, n: i + 1, startDay: start, endDay: start + length - 1 };
    start += length;
    return phase;
  });
}

/** Allowed candidates for a pattern, in preference order. */
function allowedCandidates(
  pattern: MovementPattern,
  byId: ReadonlyMap<string, CatalogExercise>,
  ctx: RuleContext,
  config: LevelConfig,
): CatalogExercise[] {
  const allowed = pattern.candidates
    .map((id) => byId.get(id))
    .filter((ex): ex is CatalogExercise => ex !== undefined && exclusionReason(ex, ctx) === null);
  if (!config.preferHarder) return allowed;
  // Stable sort: the hardest allowed variant first, list order otherwise.
  return [...allowed].sort((a, b) => DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[a.difficulty]);
}

function longestMinutes(exercises: PlanExercise[], phases: readonly PlanPhase[]): number {
  return Math.max(...phases.map((p) => estimateSessionMinutes({ exercises }, p)));
}

/** The program-style name (first alias) where there is one, so logs line up with the gallery. */
function displayName(ex: CatalogExercise): string {
  return ex.aliases[0] ?? ex.name;
}

const KNEE_CAUTION_NOTE = 'Knee: partial range only, as deep as stays pain-free.';

interface BuiltSession {
  session: PlanSession;
  /** Swap options per exercise name, from the same pattern. */
  swaps: Record<string, string[]>;
}

function buildSession(
  template: SessionTemplate,
  config: LevelConfig,
  ctx: RuleContext,
  byId: ReadonlyMap<string, CatalogExercise>,
  phases: readonly PlanPhase[],
  minutesPerSession: number,
): BuiltSession {
  const levelIndex = LEVEL_INDEX[config.level];
  const used = new Set<string>();
  const picks: { exercise: PlanExercise; finisher: boolean; alternatives: string[] }[] = [];

  for (const slot of template.slots) {
    if (slot.levels && !slot.levels.includes(config.level)) continue;
    const pattern: MovementPattern = PATTERNS[slot.pattern];
    const options = allowedCandidates(pattern, byId, ctx, config).filter((ex) => !used.has(ex.id));
    const choice = options[0];
    if (!choice) continue;
    used.add(choice.id);

    const exercise: PlanExercise = {
      name: displayName(choice),
      catalogId: choice.id,
      reps: pattern.reps[levelIndex],
      rest: config.rest[pattern.tier],
    };
    if (needsKneeCaution(choice, ctx)) exercise.note = KNEE_CAUTION_NOTE;
    picks.push({
      exercise,
      finisher: pattern.finisher === true,
      alternatives: options.slice(1, 3).map(displayName),
    });
  }

  // Drop moves from the end until the session fits the user's time.
  const budget = minutesPerSession * TIME_TOLERANCE;
  const withFinisherRest = (list: typeof picks): PlanExercise[] => {
    const lastFinisher = list.map((p) => p.finisher).lastIndexOf(true);
    return list.map((p, i) =>
      p.finisher
        ? { ...p.exercise, rest: i === lastFinisher ? config.rest.finisher : config.rest.superset }
        : p.exercise,
    );
  };
  let kept = picks;
  while (kept.length > MIN_EXERCISES && longestMinutes(withFinisherRest(kept), phases) > budget) {
    kept = kept.slice(0, -1);
  }

  const exercises = withFinisherRest(kept);
  const swaps: Record<string, string[]> = {};
  for (const p of kept) if (p.alternatives.length) swaps[p.exercise.name] = p.alternatives;

  const session: PlanSession = {
    id: template.id,
    name: template.name,
    shortName: template.shortName,
    focus: template.focus,
    exercises,
  };
  if (exercises.some((e) => e.note === KNEE_CAUTION_NOTE)) {
    session.note =
      'Keep knees tracking over toes. Stop any move that causes sharp knee pain and use the swap.';
  }
  return { session, swaps };
}

const INJURY_NOTES: Record<UserProfile['injuries'][number]['area'], string> = {
  knee: 'Knee: no jumping, no deep lunges. Squats and wall sits go only as deep as stays pain-free.',
  back: 'Back: loaded hinges, bent-over rows and twists are left out. Brace before every rep.',
  shoulder:
    'Shoulder: overhead pressing is left out. Raises stay below shoulder height if they pinch.',
  wrist: 'Wrist: push-ups and wrist curls are left out. Keep wrists straight when holding weights.',
  other:
    'You noted an injury. Skip or swap any move that hurts it, and ask a physiotherapist if unsure.',
};

function planNotes(profile: UserProfile, config: LevelConfig): string[] {
  const notes = [
    'Move slowly and with control: clean form first, then add weight.',
    ...config.notes,
  ];
  const areas = [...new Set(profile.injuries.map((i) => i.area))];
  for (const area of areas) notes.push(INJURY_NOTES[area]);
  if (profile.health.conditions.trim() !== '' && !profile.health.clearedByDoctor) {
    notes.push(
      'You listed a health condition. Check with a doctor before starting, and stop if anything feels wrong.',
    );
  }
  notes.push('Sharp pain means stop that move, take the swap, and carry on.');
  return notes;
}

export interface GenerateOptions {
  /** Defaults to the bundled catalog. */
  catalog?: readonly CatalogExercise[];
  /** Overrides the length from the profile's target date. */
  totalDays?: number;
  /** createdAt timestamp; defaults to now. */
  now?: string;
}

/**
 * A complete built-in plan for this profile at `level`: length from the target
 * date, a weekly split from days per week (1–6; 7 gets 6 plus a rest day), sessions picked from the
 * catalog under the equipment, level and injury rules, trimmed to the user's
 * minutes per session, and phases scaled to the plan length.
 */
export function generatePlan(
  profile: UserProfile,
  level: PlanLevel,
  startDate: string,
  options: GenerateOptions = {},
): TrainingPlan {
  const config = LEVELS[level];
  const catalog = options.catalog ?? loadCatalog().exercises;
  const byId = new Map(catalog.map((ex) => [ex.id, ex]));
  const ctx = ruleContextFor(profile, level);

  const totalDays = Math.min(
    MAX_PLAN_DAYS,
    Math.max(MIN_PLAN_DAYS, options.totalDays ?? planLengthFor(profile, startDate)),
  );
  const phases = phasesFor(config, totalDays);

  const daysPerWeek = Math.min(6, Math.max(1, profile.daysPerWeek)) as keyof typeof SPLITS;
  const split = SPLITS[daysPerWeek];

  const substitutions: Record<string, string[]> = {};
  const sessions = split.sessions.map((template) => {
    const built = buildSession(template, config, ctx, byId, phases, profile.minutesPerSession);
    for (const [name, alts] of Object.entries(built.swaps)) {
      substitutions[name] = [...new Set([...(substitutions[name] ?? []), ...alts])];
    }
    return built.session;
  });

  const weekly = Object.fromEntries(
    WEEKDAYS.map((d) => [d, d === 'sun' ? REST_DAY : WALK_DAY]),
  ) as Record<Weekday, string>;
  for (const [day, id] of split.days) weekly[day] = id;

  return {
    version: 1,
    source: planSourceFor(level),
    name: `${config.label} · ${totalDays} days · ${daysPerWeek}×/week`,
    startDate,
    totalDays,
    weekly,
    sessions,
    phases,
    substitutions,
    notes: planNotes(profile, config),
    createdAt: options.now ?? new Date().toISOString(),
  };
}

/** Last day of a plan as YYYY-MM-DD. */
export function planEndDate(plan: Pick<TrainingPlan, 'startDate' | 'totalDays'>): string {
  return formatISO(addDays(parseISO(plan.startDate), plan.totalDays - 1));
}
