import { ageOn, type Sex, type UserProfile } from './profile';
import type { WeightEntry } from '@/types';

export interface NutritionTargets {
  kcal: number;
  pro: number;
  bmr: number;
  tdee: number;
}

export interface TargetInputs {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  /** TDEE multiplier on BMR. Default 1.45 (light-to-moderate activity). */
  activityFactor?: number;
  /** Added to TDEE for the calorie target. Default −450 (fat loss). */
  kcalDelta?: number;
}

export const DEFAULT_ACTIVITY_FACTOR = 1.45;
export const DEFAULT_KCAL_DELTA = -450;

/** Mifflin-St Jeor sex constant; 'unspecified' uses the midpoint of the two. */
const SEX_CONSTANT: Record<Sex, number> = { male: 5, female: -161, unspecified: -78 };

/** Most recent logged weight by date, falling back to the given start weight. */
export function currentWeight(weights: WeightEntry[], fallbackKg: number): number {
  if (weights.length === 0) return fallbackKg;
  const latest = [...weights].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return latest[latest.length - 1].kg;
}

/**
 * Mifflin-St Jeor BMR, × activity factor for TDEE, + calorie delta for the
 * target (rounded to nearest 10), protein ~1.8 g/kg.
 */
export function targets({
  weightKg,
  heightCm,
  ageYears,
  sex,
  activityFactor = DEFAULT_ACTIVITY_FACTOR,
  kcalDelta = DEFAULT_KCAL_DELTA,
}: TargetInputs): NutritionTargets {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + SEX_CONSTANT[sex];
  const tdee = bmr * activityFactor;
  const kcal = Math.round((tdee + kcalDelta) / 10) * 10;
  const pro = Math.round(weightKg * 1.8);
  return { kcal, pro, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

/** Targets for a profile at its current weight, with age derived for `today`. */
export function targetsForProfile(
  profile: UserProfile,
  weightKg: number,
  today: string,
): NutritionTargets {
  return targets({
    weightKg,
    heightCm: profile.heightCm,
    ageYears: ageOn(profile.birthDate, today),
    sex: profile.sex,
  });
}
