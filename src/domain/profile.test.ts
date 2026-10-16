import { describe, expect, it } from 'vitest';
import { ageOn, hasInjury, userProfileSchema } from './profile';
import { legacyProfile } from './plans/legacy';

describe('ageOn', () => {
  it('counts whole years, turning over on the birthday', () => {
    expect(ageOn('1994-10-16', '2026-10-15')).toBe(31);
    expect(ageOn('1994-10-16', '2026-10-16')).toBe(32);
  });
});

describe('legacyProfile (seeded from the old hard-coded constants)', () => {
  const profile = legacyProfile('2026-01-05', '2026-10-16', 'now');

  it('is a valid profile', () => {
    expect(userProfileSchema.parse(profile)).toEqual(profile);
  });

  it('carries 166 cm, 80 → 70 kg, age 32 today, and a 180-day target', () => {
    expect(profile).toMatchObject({ heightCm: 166, startWeightKg: 80, goalWeightKg: 70 });
    expect(ageOn(profile.birthDate, '2026-10-16')).toBe(32);
    expect(profile.targetDate).toBe('2026-07-03'); // day 180 from 2026-01-05
    expect(hasInjury(profile, 'knee')).toBe(true);
  });
});

describe('userProfileSchema', () => {
  it('rejects out-of-range values', () => {
    const base = legacyProfile('2026-01-05', '2026-10-16', 'now');
    expect(userProfileSchema.safeParse({ ...base, heightCm: 20 }).success).toBe(false);
    expect(userProfileSchema.safeParse({ ...base, dietRating: 6 }).success).toBe(false);
    expect(userProfileSchema.safeParse({ ...base, equipment: [] }).success).toBe(false);
  });
});
