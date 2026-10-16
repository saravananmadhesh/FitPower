import { describe, expect, it } from 'vitest';
import { currentWeight, targets, targetsForProfile } from './nutrition';
import { LEGACY_PROFILE_VALUES, legacyProfile } from './plans/legacy';

const { heightCm, startWeightKg, ageYears } = LEGACY_PROFILE_VALUES;

describe('targets (v1 parity: Mifflin-St Jeor, x1.45 TDEE, -450 kcal)', () => {
  it('matches v1 output at the start weight (80kg, 166cm, age 32)', () => {
    // bmr = 10*80 + 6.25*166 - 5*32 + 5 = 1682.5 -> round 1683
    // tdee = 1682.5 * 1.45 = 2439.625 -> round 2440
    // kcal = round((2439.625-450)/10)*10 = 1990
    // pro = round(80*1.8) = 144
    expect(targets({ weightKg: startWeightKg, heightCm, ageYears, sex: 'male' })).toEqual({
      bmr: 1683,
      tdee: 2440,
      kcal: 1990,
      pro: 144,
    });
  });

  it('matches v1 output at a lower logged weight (75kg)', () => {
    // bmr = 750 + 1037.5 - 160 + 5 = 1632.5 -> round 1633
    // tdee = 1632.5 * 1.45 = 2367.125 -> round 2367
    // kcal = round((2367.125-450)/10)*10 = 1920
    // pro = round(75*1.8) = 135
    expect(targets({ weightKg: 75, heightCm, ageYears, sex: 'male' })).toEqual({
      bmr: 1633,
      tdee: 2367,
      kcal: 1920,
      pro: 135,
    });
  });

  it('uses the female constant (−161) and the midpoint (−78) when unspecified', () => {
    // bmr = 800 + 1037.5 - 160 - 161 = 1516.5
    expect(targets({ weightKg: 80, heightCm, ageYears, sex: 'female' }).bmr).toBe(1517);
    // bmr = 800 + 1037.5 - 160 - 78 = 1599.5
    expect(targets({ weightKg: 80, heightCm, ageYears, sex: 'unspecified' }).bmr).toBe(1600);
  });

  it('applies a custom activity factor and calorie delta', () => {
    // bmr 1682.5 * 1.2 = 2019 ; +300 -> 2319 -> 2320
    expect(
      targets({
        weightKg: 80,
        heightCm,
        ageYears,
        sex: 'male',
        activityFactor: 1.2,
        kcalDelta: 300,
      }),
    ).toMatchObject({ tdee: 2019, kcal: 2320 });
  });
});

describe('targetsForProfile', () => {
  it('gives the legacy profile exactly the old hard-coded numbers', () => {
    const profile = legacyProfile('2026-01-05', '2026-10-16');
    expect(targetsForProfile(profile, 80, '2026-10-16')).toEqual({
      bmr: 1683,
      tdee: 2440,
      kcal: 1990,
      pro: 144,
    });
  });

  it('sets the calorie target from the goal: deficit, surplus or maintenance', () => {
    const base = legacyProfile('2026-01-05', '2026-10-16');
    const kcal = (goalType: typeof base.goalType) =>
      targetsForProfile({ ...base, goalType }, 80, '2026-10-16').kcal;
    expect(kcal('fat-loss')).toBe(1990);
    expect(kcal('muscle')).toBe(2690);
    expect(kcal('fitness')).toBe(2440);
    expect(kcal('maintain')).toBe(2440);
  });
});

describe('currentWeight (v1 parity: latest logged weight by date, else fallback)', () => {
  it('falls back to the start weight when nothing is logged', () => {
    expect(currentWeight([], startWeightKg)).toBe(80);
  });

  it('returns the most recent entry regardless of input order', () => {
    const weights = [
      { date: '2026-01-05', kg: 78 },
      { date: '2026-01-01', kg: 80 },
      { date: '2026-01-03', kg: 79 },
    ];
    expect(currentWeight(weights, startWeightKg)).toBe(78);
  });
});
