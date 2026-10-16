import { AGE_YEARS } from './constants';
import type { WeightEntry } from '@/types';

export interface NutritionTargets {
  kcal: number;
  pro: number;
  bmr: number;
  tdee: number;
}

/** Most recent logged weight by date, falling back to the given start weight. */
export function currentWeight(weights: WeightEntry[], fallbackKg: number): number {
  if (weights.length === 0) return fallbackKg;
  const latest = [...weights].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return latest[latest.length - 1].kg;
}

/**
 * Mifflin-St Jeor BMR, x1.45 activity factor, -450 kcal fat-loss deficit
 * (rounded to nearest 10), protein ~1.8 g/kg.
 */
export function targets(
  weightKg: number,
  heightCm: number,
  age: number = AGE_YEARS,
): NutritionTargets {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const tdee = bmr * 1.45;
  const kcal = Math.round((tdee - 450) / 10) * 10;
  const pro = Math.round(weightKg * 1.8);
  return { kcal, pro, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}
