import type { Catalog, CatalogExercise } from '@/domain/catalog';
import { trainingPlanSchema, type TrainingPlan } from '@/domain/plan';
import { checkPlan, needsKneeCaution, ruleContextFor } from '@/domain/planRules';
import { userProfileSchema, type UserProfile } from '@/domain/profile';

/** What the model sends to `propose_plan`. The harness fills in the rest. */
export interface AiPlanDraft {
  name?: unknown;
  startDate?: unknown;
  totalDays?: unknown;
  weekly?: unknown;
  sessions?: unknown;
  phases?: unknown;
  substitutions?: unknown;
  notes?: unknown;
}

export type PlanCheck =
  { ok: true; plan: TrainingPlan; warnings: string[] } | { ok: false; errors: string[] };

interface DraftExercise {
  catalogId?: unknown;
  name?: unknown;
  [key: string]: unknown;
}

function issuePath(path: PropertyKey[]): string {
  return path
    .map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`))
    .join('')
    .slice(1);
}

/**
 * Turns a model draft into a `TrainingPlan` and checks it: the shared zod
 * schema, then the shared plan rules (`domain/planRules.checkPlan`) that the
 * built-in generator also obeys. Errors go back to the model so it can fix
 * the draft and try again; warnings go back as cautions.
 */
export function checkPlanDraft(
  draft: AiPlanDraft,
  ctx: { profile: UserProfile; catalog: Catalog; defaultStartDate: string; now: string },
): PlanCheck {
  const byId = new Map<string, CatalogExercise>(ctx.catalog.exercises.map((e) => [e.id, e]));
  const errors: string[] = [];
  const warnings: string[] = [];

  // Exercise names come from the catalog so set logs, swaps and gallery links line up.
  const sessions = Array.isArray(draft.sessions)
    ? draft.sessions.map((s: unknown, si: number) => {
        if (!s || typeof s !== 'object') return s;
        const session = s as { exercises?: unknown };
        const exercises = Array.isArray(session.exercises)
          ? session.exercises.map((e: unknown, ei: number) => {
              if (!e || typeof e !== 'object') return e;
              const ex = e as DraftExercise;
              const id = typeof ex.catalogId === 'string' ? ex.catalogId : '';
              const found = byId.get(id);
              if (!found) {
                errors.push(
                  `sessions[${si}].exercises[${ei}].catalogId: "${id}" is not in the exercise catalog; use search_exercises to find a valid id`,
                );
                return ex;
              }
              return { ...ex, name: found.name, catalogId: found.id };
            })
          : session.exercises;
        return { ...session, exercises };
      })
    : draft.sessions;

  const parsed = trainingPlanSchema.safeParse({
    version: 1,
    source: 'ai',
    name: draft.name,
    startDate: typeof draft.startDate === 'string' ? draft.startDate : ctx.defaultStartDate,
    totalDays: draft.totalDays,
    weekly: draft.weekly,
    sessions,
    phases: draft.phases,
    substitutions: draft.substitutions ?? {},
    notes: draft.notes ?? [],
    createdAt: ctx.now,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issuePath(issue.path) || 'plan'}: ${issue.message}`);
    }
  }
  if (errors.length > 0 || !parsed.success) return { ok: false, errors };

  // The same safety and fit rules the built-in generator follows (equipment,
  // bench, knee/back/shoulder/wrist, days per week, session length).
  const plan = parsed.data;
  const ruleCtx = ruleContextFor(ctx.profile);
  for (const issue of checkPlan(plan, ctx.profile, ctx.catalog.exercises)) {
    const line = `${issuePath(issue.path) || 'plan'}: ${issue.message}`;
    if (issue.severity === 'error') errors.push(line);
    else warnings.push(line);
  }
  for (const session of plan.sessions) {
    for (const ex of session.exercises) {
      const found = ex.catalogId ? byId.get(ex.catalogId) : undefined;
      if (found && needsKneeCaution(found, ruleCtx)) {
        warnings.push(`${found.name} is knee-caution; add a pain-free, partial-range note.`);
      }
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, plan, warnings };
}

/** Profile fields the coach may propose to change (always confirmed by the user). */
export const EDITABLE_PROFILE_FIELDS = [
  'goalType',
  'goalWeightKg',
  'targetDate',
  'experience',
  'injuries',
  'health',
  'dietRating',
  'healthRating',
  'daysPerWeek',
  'minutesPerSession',
  'equipment',
] as const;

export type ProfileCheck =
  { ok: true; profile: UserProfile; changed: string[] } | { ok: false; errors: string[] };

export function checkProfilePatch(
  patch: Record<string, unknown>,
  profile: UserProfile,
  now: string,
): ProfileCheck {
  const errors: string[] = [];
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if ((EDITABLE_PROFILE_FIELDS as readonly string[]).includes(key)) picked[key] = value;
    else errors.push(`${key}: this field can't be changed by the coach`);
  }
  const changed = Object.keys(picked);
  if (changed.length === 0) errors.push('patch: nothing to change');
  const parsed = userProfileSchema.safeParse({ ...profile, ...picked, updatedAt: now });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issuePath(issue.path) || 'profile'}: ${issue.message}`);
    }
  }
  if (errors.length > 0 || !parsed.success) return { ok: false, errors };
  return { ok: true, profile: parsed.data, changed };
}
