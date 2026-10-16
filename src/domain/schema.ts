import { z } from 'zod';
import { todayISO } from './dates';
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
});

/** Validates + backfills a v1 or v2 JSON backup into the canonical v2 AppData shape. */
export function normalizeBackup(raw: unknown): AppData {
  const parsed = backupImportSchema.parse(raw);
  return {
    startDate: parsed.startDate ?? todayISO(),
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
  };
}
