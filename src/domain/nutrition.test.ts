import { describe, expect, it } from 'vitest';
import { currentWeight, targets } from './nutrition';
import { HEIGHT_CM, START_WEIGHT_KG, AGE_YEARS } from './constants';

describe('targets (v1 parity: Mifflin-St Jeor, x1.45 TDEE, -450 kcal)', () => {
  it('matches v1 output at the start weight (80kg, 166cm, age 32)', () => {
    // bmr = 10*80 + 6.25*166 - 5*32 + 5 = 1682.5 -> round 1683
    // tdee = 1682.5 * 1.45 = 2439.625 -> round 2440
    // kcal = round((2439.625-450)/10)*10 = 1990
    // pro = round(80*1.8) = 144
    expect(targets(START_WEIGHT_KG, HEIGHT_CM, AGE_YEARS)).toEqual({
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
    expect(targets(75, HEIGHT_CM, AGE_YEARS)).toEqual({
      bmr: 1633,
      tdee: 2367,
      kcal: 1920,
      pro: 135,
    });
  });
});

describe('currentWeight (v1 parity: latest logged weight by date, else fallback)', () => {
  it('falls back to the start weight when nothing is logged', () => {
    expect(currentWeight([], START_WEIGHT_KG)).toBe(80);
  });

  it('returns the most recent entry regardless of input order', () => {
    const weights = [
      { date: '2026-01-05', kg: 78 },
      { date: '2026-01-01', kg: 80 },
      { date: '2026-01-03', kg: 79 },
    ];
    expect(currentWeight(weights, START_WEIGHT_KG)).toBe(78);
  });
});
