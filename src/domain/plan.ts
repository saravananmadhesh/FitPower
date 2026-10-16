import { z } from 'zod';
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');

/** Plan weekdays, Monday first (display order). */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** Non-training slots in `TrainingPlan.weekly`. Anything else is a session id. */
export const WALK_DAY = 'walk';
export const REST_DAY = 'rest';

export const PLAN_SOURCES = [
  'builtin-easy',
  'builtin-intermediate',
  'builtin-hard',
  'ai',
  'legacy',
] as const;

export const planExerciseSchema = z.object({
  /** Display name; also the key set logs are stored under (`AppData.sets`). */
  name: z.string().min(1),
  /** Exercise-catalog id, when the move is in the gallery. */
  catalogId: z.string().min(1).optional(),
  /** Per-set prescription shown to the user, e.g. "10 reps" or "40 sec". */
  reps: z.string().min(1),
  /** Work window in seconds; falls back to the phase's `work`. */
  work: z.number().int().positive().optional(),
  /** Rest after this exercise in seconds; falls back to the phase's `rest`. */
  rest: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
});

export const planSessionSchema = z.object({
  id: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,12}$/, 'Session ids are 1–12 letters, digits, - or _')
    .refine((id) => id !== WALK_DAY && id !== REST_DAY, 'Session id is reserved'),
  name: z.string().min(1),
  /** Short label for compact lists such as the weekly split. Falls back to `name`. */
  shortName: z.string().min(1).optional(),
  focus: z.string().min(1),
  exercises: z.array(planExerciseSchema).min(1),
  /** Safety or form note shown under the exercise list. */
  note: z.string().optional(),
});

export const planPhaseSchema = z.object({
  n: z.number().int().min(1),
  name: z.string().min(1),
  startDay: z.number().int().min(1),
  endDay: z.number().int().min(1),
  work: z.number().int().positive(),
  rest: z.number().int().nonnegative(),
  rounds: z.number().int().min(1).max(10),
  note: z.string().default(''),
});

const weeklySchema = z.object(
  Object.fromEntries(WEEKDAYS.map((d) => [d, z.string().min(1)])) as Record<Weekday, z.ZodString>,
);

/**
 * A complete, data-driven training plan. Built-in generators and the AI coach
 * both produce this shape, and the same schema validates both.
 */
export const trainingPlanSchema = z
  .object({
    version: z.literal(1),
    source: z.enum(PLAN_SOURCES),
    name: z.string().min(1),
    startDate: isoDate,
    totalDays: z.number().int().min(7).max(730),
    /** Weekday → session id, or `walk` / `rest`. */
    weekly: weeklySchema,
    sessions: z.array(planSessionSchema).min(1),
    phases: z.array(planPhaseSchema).min(1),
    /** One-tap swaps, keyed by exercise name. */
    substitutions: z.record(z.string(), z.array(z.string().min(1))).default({}),
    notes: z.array(z.string()).default([]),
    createdAt: z.string(),
  })
  .superRefine((plan, ctx) => {
    const ids = new Set<string>();
    plan.sessions.forEach((s, i) => {
      if (ids.has(s.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate session id "${s.id}"`,
          path: ['sessions', i, 'id'],
        });
      }
      ids.add(s.id);
    });

    for (const day of WEEKDAYS) {
      const slot = plan.weekly[day];
      if (slot !== WALK_DAY && slot !== REST_DAY && !ids.has(slot)) {
        ctx.addIssue({
          code: 'custom',
          message: `unknown session "${slot}"`,
          path: ['weekly', day],
        });
      }
    }

    // Phases must tile day 1 … totalDays with no gaps or overlaps.
    let expectedStart = 1;
    plan.phases.forEach((p, i) => {
      const path = ['phases', i];
      if (p.n !== i + 1)
        ctx.addIssue({ code: 'custom', message: `phase ${i} should be n=${i + 1}`, path });
      if (p.startDay !== expectedStart) {
        ctx.addIssue({
          code: 'custom',
          message: `phase ${p.n} should start on day ${expectedStart}`,
          path,
        });
      }
      if (p.endDay < p.startDay) {
        ctx.addIssue({ code: 'custom', message: `phase ${p.n} ends before it starts`, path });
      }
      expectedStart = p.endDay + 1;
    });
    if (expectedStart !== plan.totalDays + 1) {
      ctx.addIssue({
        code: 'custom',
        message: `phases must end on day ${plan.totalDays}`,
        path: ['phases'],
      });
    }
  });

export type TrainingPlan = z.infer<typeof trainingPlanSchema>;
export type PlanSession = z.infer<typeof planSessionSchema>;
export type PlanExercise = z.infer<typeof planExerciseSchema>;
export type PlanPhase = z.infer<typeof planPhaseSchema>;
export type PlanSource = (typeof PLAN_SOURCES)[number];
/** A weekly slot: a session id, `walk` or `rest`. */
export type DaySlot = string;

/** Plan weekday for a date (Date#getDay is 0 = Sunday). */
export function weekdayOf(date: Date): Weekday {
  return WEEKDAYS[(date.getDay() + 6) % 7];
}

/** What the plan schedules on `date`: a session id, `walk` or `rest`. */
export function dayTypeFor(plan: TrainingPlan, date: Date): DaySlot {
  return plan.weekly[weekdayOf(date)];
}

export function isTrainingSlot(slot: DaySlot): boolean {
  return slot !== WALK_DAY && slot !== REST_DAY;
}

export function isTrainingDay(plan: TrainingPlan, date: Date): boolean {
  return isTrainingSlot(dayTypeFor(plan, date));
}

export function sessionById(plan: TrainingPlan, id: string): PlanSession | undefined {
  return plan.sessions.find((s) => s.id === id);
}

/** The session scheduled on `date`, or null on walk/rest days. */
export function sessionFor(plan: TrainingPlan, date: Date): PlanSession | null {
  const slot = dayTypeFor(plan, date);
  return isTrainingSlot(slot) ? (sessionById(plan, slot) ?? null) : null;
}

/** Clamps a raw day number into the plan, 1 … totalDays. */
export function clampDay(plan: TrainingPlan, dayNum: number): number {
  return Math.max(1, Math.min(plan.totalDays, dayNum));
}

/** The phase covering `dayNum`; days outside the plan clamp to the first/last phase. */
export function phaseFor(plan: TrainingPlan, dayNum: number): PlanPhase {
  const day = clampDay(plan, dayNum);
  return (
    plan.phases.find((p) => day >= p.startDay && day <= p.endDay) ??
    plan.phases[plan.phases.length - 1]
  );
}
