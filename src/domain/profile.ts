import { z } from 'zod';
import { DIFFICULTIES, EQUIPMENT } from './constants';
import { parseISO } from './dates';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');

export const SEXES = ['male', 'female', 'unspecified'] as const;
export const GOAL_TYPES = ['fat-loss', 'muscle', 'fitness', 'maintain'] as const;
export const INJURY_AREAS = ['knee', 'back', 'shoulder', 'wrist', 'other'] as const;
export const INJURY_SIDES = ['left', 'right', 'both'] as const;

export const injurySchema = z.object({
  area: z.enum(INJURY_AREAS),
  side: z.enum(INJURY_SIDES).optional(),
  note: z.string().max(500).default(''),
});

const rating = z.number().int().min(1).max(5);

/**
 * Everything the app knows about the person using it. Collected by first-run
 * onboarding (or seeded from the old hard-coded values for existing installs)
 * and read by every page instead of fixed constants.
 */
export const userProfileSchema = z.object({
  name: z.string().max(60).default(''),
  birthDate: isoDate,
  /** Used only for the BMR formula; 'unspecified' uses the midpoint constant. */
  sex: z.enum(SEXES),
  heightCm: z.number().min(100).max(250),
  /** Weight when the profile was created; current weight comes from the weight log. */
  startWeightKg: z.number().min(30).max(300),
  goalWeightKg: z.number().min(30).max(300),
  goalType: z.enum(GOAL_TYPES),
  targetDate: isoDate,
  experience: z.enum(DIFFICULTIES),
  injuries: z.array(injurySchema).default([]),
  health: z
    .object({
      conditions: z.string().max(1000).default(''),
      clearedByDoctor: z.boolean().default(false),
    })
    .default({ conditions: '', clearedByDoctor: false }),
  dietRating: rating,
  healthRating: rating,
  daysPerWeek: z.number().int().min(1).max(7),
  minutesPerSession: z.number().int().min(10).max(180),
  equipment: z.array(z.enum(EQUIPMENT)).min(1),
  units: z.literal('metric').default('metric'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type Injury = z.infer<typeof injurySchema>;
export type Sex = (typeof SEXES)[number];

/** Whole years between `birthDate` and `today` (both YYYY-MM-DD). */
export function ageOn(birthDate: string, today: string): number {
  const b = parseISO(birthDate);
  const t = parseISO(today);
  let age = t.getFullYear() - b.getFullYear();
  const beforeBirthday =
    t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate());
  if (beforeBirthday) age--;
  return Math.max(0, age);
}

export function hasInjury(profile: UserProfile, area: Injury['area']): boolean {
  return profile.injuries.some((i) => i.area === area);
}
