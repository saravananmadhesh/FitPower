import { z } from 'zod';
import { todayISO } from './dates';
import { userProfileSchema } from './profile';
import { trainingPlanSchema } from './plan';
import { legacyPlan, legacyProfile } from './plans/legacy';
import type { AppData } from '@/types';

export const weightEntrySchema = z.object({
  date: z.string(),
  kg: z.number(),
});

export const measurementSchema = z.object({
  date: z.string(),
  waist: z.number().nullable(),
  chest: z.number().nullable(),
  hip: z.number().nullable(),
});

export const dayNutritionSchema = z.object({
  kcal: z.number(),
  pro: z.number(),
  water: z.number(),
  steps: z.number(),
});

export const setLogSchema = z.object({
  w: z.number(),
  reps: z.number(),
});

export const rpeSchema = z.enum(['easy', 'right', 'hard']);

/** Canonical v2 shape — used to validate exports and app-internal state. */
export const appDataSchema = z.object({
  startDate: z.string(),
  startSet: z.boolean(),
  weights: z.array(weightEntrySchema).default([]),
  measure: z.array(measurementSchema).default([]),
  done: z.record(z.string(), z.boolean()).default({}),
  walks: z.record(z.string(), z.boolean()).default({}),
  nutrition: z.record(z.string(), dayNutritionSchema).default({}),
  sets: z.record(z.string(), z.record(z.string(), setLogSchema)).default({}),
  rpe: z.record(z.string(), rpeSchema).default({}),
  favorites: z.array(z.string()).default([]),
  lastBackup: z.string().optional(),
  backupSnoozeUntil: z.string().optional(),
  profile: userProfileSchema.optional(),
  plan: trainingPlanSchema.optional(),
});

/**
 * Backup import is lenient: accepts a v1 or v2 JSON export. `startDate`/
 * `startSet` are optional (backfilled below), and so is `favorites` (added
 * in v2.1 — older backups import as `[]`); unknown keys (e.g. v1's
 * `theme`, now owned by useUiStore) are silently stripped by zod's
 * default object parsing.
 */
export const backupImportSchema = z.object({
  startDate: z.string().optional(),
  startSet: z.boolean().optional(),
  weights: z.array(weightEntrySchema).default([]),
  measure: z.array(measurementSchema).default([]),
  done: z.record(z.string(), z.boolean()).default({}),
  walks: z.record(z.string(), z.boolean()).default({}),
  nutrition: z.record(z.string(), dayNutritionSchema).default({}),
  sets: z.record(z.string(), z.record(z.string(), setLogSchema)).default({}),
  rpe: z.record(z.string(), rpeSchema).default({}),
  favorites: z.array(z.string()).default([]),
  lastBackup: z.string().optional(),
  backupSnoozeUntil: z.string().optional(),
  profile: userProfileSchema.optional(),
  plan: trainingPlanSchema.optional(),
});

/** True when an install has anything the user logged or chose (so it predates profiles). */
export function hasUserData(
  data: Pick<
    AppData,
    'weights' | 'measure' | 'done' | 'walks' | 'nutrition' | 'sets' | 'rpe' | 'favorites'
  >,
): boolean {
  return (
    data.weights.length > 0 ||
    data.measure.length > 0 ||
    data.favorites.length > 0 ||
    [data.done, data.walks, data.nutrition, data.sets, data.rpe].some(
      (record) => Object.keys(record).length > 0,
    )
  );
}

/**
 * Validates + backfills a v1, v2 or v3 JSON backup into the canonical AppData
 * shape. A backup from before profiles existed that holds logs gets the
 * legacy profile and plan, so its numbers come out exactly as before.
 */
export function normalizeBackup(raw: unknown, today: string = todayISO()): AppData {
  const parsed = backupImportSchema.parse(raw);
  const startDate = parsed.startDate ?? parsed.plan?.startDate ?? today;
  const data: AppData = {
    startDate,
    startSet: parsed.startSet ?? true,
    weights: parsed.weights,
    measure: parsed.measure,
    done: parsed.done,
    walks: parsed.walks,
    nutrition: parsed.nutrition,
    sets: parsed.sets,
    rpe: parsed.rpe,
    favorites: [...new Set(parsed.favorites)],
    lastBackup: parsed.lastBackup,
    backupSnoozeUntil: parsed.backupSnoozeUntil,
    profile: parsed.profile,
    plan: parsed.plan ? { ...parsed.plan, startDate } : undefined,
  };
  if (!data.profile && !data.plan && hasUserData(data)) {
    data.profile = legacyProfile(startDate, today);
    data.plan = legacyPlan(startDate);
  }
  return data;
}
