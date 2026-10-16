import { z } from 'zod';
import { DIFFICULTIES, EQUIPMENT } from './constants';
import { addDays, formatISO, parseISO } from './dates';
import { ageOn, GOAL_TYPES, INJURY_AREAS, INJURY_SIDES, SEXES, type UserProfile } from './profile';

/**
 * First-run onboarding: step order, per-step validation, and the mapping from
 * the collected answers to a `UserProfile`. Pure; the wizard UI lives in
 * `components/onboarding`.
 *
 * Validation messages are i18n keys in the `onboarding` namespace
 * (`errors.*`), translated where they are shown.
 */

export const ONBOARDING_STEPS = [
  'about',
  'body',
  'goal',
  'experience',
  'health',
  'lifestyle',
  'plan',
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const PLAN_LEVELS = ['easy', 'intermediate', 'hard'] as const;
export type PlanLevel = (typeof PLAN_LEVELS)[number];

export const MIN_AGE = 13;
export const MAX_AGE = 100;
/** Shortest and longest program the target date can produce (days, inclusive). */
export const MIN_PLAN_DAYS = 28;
export const MAX_PLAN_DAYS = 730;
export const DEFAULT_PLAN_DAYS = 180;
export const DAYS_PER_WEEK_OPTIONS = [2, 3, 4, 5, 6] as const;
export const MINUTES_OPTIONS = [20, 30, 45, 60, 90] as const;

/**
 * PAR-Q+ (2023) general health questions, paraphrased. Any "yes" means the
 * user should talk to a doctor before starting; `summary` is stored in the
 * profile's health notes so later planning (and the AI coach) can see it.
 */
export const PARQ_QUESTIONS = [
  { id: 'heart', summary: 'heart condition or high blood pressure' },
  { id: 'chestPain', summary: 'chest pain at rest, in daily life or during activity' },
  {
    id: 'dizziness',
    summary: 'lost balance from dizziness or lost consciousness (last 12 months)',
  },
  { id: 'chronic', summary: 'another chronic medical condition' },
  { id: 'medication', summary: 'takes prescribed medication for a chronic condition' },
  { id: 'joint', summary: 'bone, joint or soft-tissue problem that activity could worsen' },
  { id: 'supervised', summary: 'told to exercise only under medical supervision' },
] as const;
export type ParqId = (typeof PARQ_QUESTIONS)[number]['id'];
export const PARQ_IDS = PARQ_QUESTIONS.map((q) => q.id) as ParqId[];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'errors.date');

/** Empty number inputs reach the form as NaN; treat them as "missing". */
const num = (min: number, max: number, key: string) =>
  z
    .number({ error: `errors.${key}` })
    .min(min, `errors.${key}`)
    .max(max, `errors.${key}`);

/** Radio groups hand back strings; coerce them to the numbers the profile stores. */
const choiceNum = (allowed: readonly number[], key: string) =>
  z.coerce.number({ error: `errors.${key}` }).refine((n) => allowed.includes(n), `errors.${key}`);

const injuryFieldSchema = z.object({
  selected: z.boolean(),
  side: z.union([z.enum(INJURY_SIDES), z.literal('')]),
  note: z.string().max(500, 'errors.noteLength'),
});

export function aboutSchema(today: string) {
  return z.object({
    name: z.string().trim().max(60, 'errors.nameLength'),
    birthDate: isoDate.refine((d) => {
      if (d > today) return false;
      const age = ageOn(d, today);
      return age >= MIN_AGE && age <= MAX_AGE;
    }, 'errors.age'),
    sex: z.enum(SEXES, { error: 'errors.sex' }),
  });
}

export const bodySchema = z.object({
  heightCm: num(100, 250, 'height'),
  weightKg: num(30, 300, 'weight'),
  goalWeightKg: num(30, 300, 'goalWeight'),
});

export function goalSchema(today: string) {
  return z
    .object({
      goalType: z.enum(GOAL_TYPES, { error: 'errors.goalType' }),
      startDate: isoDate.refine(
        (d) => Math.abs(calendarDaysBetween(today, d)) <= 60,
        'errors.startDate',
      ),
      targetDate: isoDate,
    })
    .refine(
      (v) => {
        const days = planLengthDays(v.startDate, v.targetDate);
        return days >= MIN_PLAN_DAYS && days <= MAX_PLAN_DAYS;
      },
      { message: 'errors.targetDate', path: ['targetDate'] },
    );
}

export const experienceSchema = z.object({
  experience: z.enum(DIFFICULTIES, { error: 'errors.experience' }),
});

export const healthSchema = z.object({
  injuries: z.object(
    Object.fromEntries(INJURY_AREAS.map((a) => [a, injuryFieldSchema])) as Record<
      (typeof INJURY_AREAS)[number],
      typeof injuryFieldSchema
    >,
  ),
  parq: z.object(
    Object.fromEntries(PARQ_IDS.map((id) => [id, z.boolean()])) as Record<ParqId, z.ZodBoolean>,
  ),
  conditions: z.string().max(600, 'errors.conditionsLength'),
  clearedByDoctor: z.boolean(),
});

export const lifestyleSchema = z.object({
  dietRating: choiceNum([1, 2, 3, 4, 5], 'rating'),
  healthRating: choiceNum([1, 2, 3, 4, 5], 'rating'),
  daysPerWeek: choiceNum(DAYS_PER_WEEK_OPTIONS, 'daysPerWeek'),
  minutesPerSession: choiceNum(MINUTES_OPTIONS, 'minutes'),
  equipment: z.array(z.enum(EQUIPMENT)).min(1, 'errors.equipment'),
});

export const planChoiceSchema = z.object({
  level: z.enum(PLAN_LEVELS, { error: 'errors.level' }),
});

export type AboutValues = z.infer<ReturnType<typeof aboutSchema>>;
export type BodyValues = z.infer<typeof bodySchema>;
export type GoalValues = z.infer<ReturnType<typeof goalSchema>>;
export type ExperienceValues = z.infer<typeof experienceSchema>;
export type HealthValues = z.infer<typeof healthSchema>;
export type LifestyleValues = z.infer<typeof lifestyleSchema>;
export type PlanChoiceValues = z.infer<typeof planChoiceSchema>;

export type OnboardingAnswers = AboutValues &
  BodyValues &
  GoalValues &
  ExperienceValues &
  HealthValues &
  LifestyleValues &
  PlanChoiceValues;

/** Answers collected so far; any step may still be missing. */
export type OnboardingDraft = Partial<OnboardingAnswers>;

/** The zod schema validating one step, for `today` (YYYY-MM-DD). */
export function schemaForStep(step: OnboardingStep, today: string) {
  switch (step) {
    case 'about':
      return aboutSchema(today);
    case 'body':
      return bodySchema;
    case 'goal':
      return goalSchema(today);
    case 'experience':
      return experienceSchema;
    case 'health':
      return healthSchema;
    case 'lifestyle':
      return lifestyleSchema;
    case 'plan':
      return planChoiceSchema;
  }
}

/** Days from `startDate` to `targetDate`, both counted (day 1 … day N). */
export function planLengthDays(startDate: string, targetDate: string): number {
  return calendarDaysBetween(startDate, targetDate) + 1;
}

/** Whole calendar days from `a` to `b`; rounds so a DST shift can't drop a day. */
function calendarDaysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

/** The target date that gives a plan of `days` days starting on `startDate`. */
export function targetDateFor(startDate: string, days: number): string {
  return formatISO(addDays(parseISO(startDate), days - 1));
}

export function emptyInjuries(): HealthValues['injuries'] {
  return Object.fromEntries(
    INJURY_AREAS.map((a) => [a, { selected: false, side: '' as const, note: '' }]),
  ) as HealthValues['injuries'];
}

export function emptyParq(): HealthValues['parq'] {
  return Object.fromEntries(PARQ_IDS.map((id) => [id, false])) as HealthValues['parq'];
}

/** Defaults for a fresh wizard. Program day 1 is tomorrow, as in v1. */
export function initialDraft(today: string): OnboardingDraft {
  const startDate = formatISO(addDays(parseISO(today), 1));
  return {
    name: '',
    startDate,
    targetDate: targetDateFor(startDate, DEFAULT_PLAN_DAYS),
    injuries: emptyInjuries(),
    parq: emptyParq(),
    conditions: '',
    clearedByDoctor: false,
    equipment: ['dumbbell', 'band'],
  };
}

/** Pre-fills the wizard from an existing profile (retaking onboarding). */
export function draftFromProfile(profile: UserProfile, today: string): OnboardingDraft {
  const injuries = emptyInjuries();
  for (const i of profile.injuries) {
    injuries[i.area] = { selected: true, side: i.side ?? '', note: i.note };
  }
  const base = initialDraft(today);
  return {
    ...base,
    name: profile.name,
    birthDate: profile.birthDate,
    sex: profile.sex,
    heightCm: profile.heightCm,
    weightKg: profile.startWeightKg,
    goalWeightKg: profile.goalWeightKg,
    goalType: profile.goalType,
    experience: profile.experience,
    injuries,
    // Earlier PAR-Q answers are folded into `conditions`; keep that text as-is.
    conditions: stripParqSummary(profile.health.conditions),
    clearedByDoctor: profile.health.clearedByDoctor,
    dietRating: profile.dietRating,
    healthRating: profile.healthRating,
    daysPerWeek: profile.daysPerWeek,
    minutesPerSession: profile.minutesPerSession,
    equipment: profile.equipment,
  };
}

/** True when anything the user said calls for a doctor's OK before training. */
export function needsDoctorNotice(health: Pick<HealthValues, 'parq' | 'conditions'>): boolean {
  return PARQ_IDS.some((id) => health.parq[id]) || health.conditions.trim().length > 0;
}

const PARQ_PREFIX = 'Health screen (PAR-Q) yes: ';

function stripParqSummary(conditions: string): string {
  return conditions
    .split('\n')
    .filter((line) => !line.startsWith(PARQ_PREFIX))
    .join('\n')
    .trim();
}

/** Free-text conditions plus a line listing every PAR-Q "yes". */
export function healthNotes(health: Pick<HealthValues, 'parq' | 'conditions'>): string {
  const yes = PARQ_QUESTIONS.filter((q) => health.parq[q.id]).map((q) => q.summary);
  const lines = [health.conditions.trim()];
  if (yes.length > 0) lines.push(PARQ_PREFIX + yes.join('; '));
  return lines.filter(Boolean).join('\n');
}

/**
 * Suggested built-in level: experience sets the starting point; low
 * self-rated health, an injury, or an un-cleared health flag steps it down.
 */
export function recommendLevel(
  answers: Pick<
    OnboardingAnswers,
    'experience' | 'healthRating' | 'injuries' | 'parq' | 'conditions' | 'clearedByDoctor'
  >,
): PlanLevel {
  let index: number = DIFFICULTIES.indexOf(answers.experience);
  const injured = Object.values(answers.injuries).some((i) => i.selected);
  const flagged = needsDoctorNotice(answers) && !answers.clearedByDoctor;
  if (answers.healthRating <= 2) index--;
  if (injured || flagged) index--;
  if (flagged) index = 0;
  return PLAN_LEVELS[Math.max(0, Math.min(PLAN_LEVELS.length - 1, index))];
}

/** Builds the profile the wizard saves. `now` is an ISO timestamp. */
export function profileFromAnswers(
  answers: OnboardingAnswers,
  now: string,
  createdAt: string = now,
): UserProfile {
  const injuries = INJURY_AREAS.filter((a) => answers.injuries[a].selected).map((area) => {
    const { side, note } = answers.injuries[area];
    return { area, ...(side ? { side } : {}), note: note.trim() };
  });
  return {
    name: answers.name.trim(),
    birthDate: answers.birthDate,
    sex: answers.sex,
    heightCm: answers.heightCm,
    startWeightKg: answers.weightKg,
    goalWeightKg: answers.goalWeightKg,
    goalType: answers.goalType,
    targetDate: answers.targetDate,
    experience: answers.experience,
    injuries,
    health: { conditions: healthNotes(answers), clearedByDoctor: answers.clearedByDoctor },
    dietRating: answers.dietRating,
    healthRating: answers.healthRating,
    daysPerWeek: answers.daysPerWeek,
    minutesPerSession: answers.minutesPerSession,
    equipment: answers.equipment,
    units: 'metric',
    createdAt,
    updatedAt: now,
  };
}

/** The first step whose answers are missing or invalid, or null if all are complete. */
export function firstIncompleteStep(draft: OnboardingDraft, today: string): OnboardingStep | null {
  for (const step of ONBOARDING_STEPS) {
    if (!schemaForStep(step, today).safeParse(draft).success) return step;
  }
  return null;
}
