import { describe, expect, it } from 'vitest';
import { appDataSchema, normalizeBackup } from './schema';
import { legacyPlan, legacyProfile } from './plans/legacy';
import type { AppData } from '@/types';

const fullAppData: AppData = {
  startDate: '2026-01-05',
  startSet: true,
  weights: [{ date: '2026-01-05', kg: 80 }],
  measure: [{ date: '2026-01-05', waist: 92, chest: null, hip: null }],
  done: { '2026-01-05': true },
  walks: {},
  nutrition: { '2026-01-05': { kcal: 1990, pro: 144, water: 500, steps: 3000 } },
  sets: { '2026-01-05': { 'DB floor press': { w: 8, reps: 10 } } },
  rpe: { '2026-01-05': 'right' },
  favorites: ['DB_Goblet_Squat'],
  lastBackup: '2026-01-05',
  backupSnoozeUntil: undefined,
};

describe('appDataSchema', () => {
  it('accepts a well-formed v2 export as-is', () => {
    expect(appDataSchema.parse(fullAppData)).toMatchObject({
      startDate: '2026-01-05',
      weights: [{ date: '2026-01-05', kg: 80 }],
    });
  });
});

const TODAY = '2026-10-16';
const withProfile: AppData = {
  ...fullAppData,
  profile: { ...legacyProfile('2026-01-05', TODAY, 'now'), name: 'Alex', heightCm: 175 },
  plan: legacyPlan('2026-01-05', 'now'),
};

describe('normalizeBackup (CLAUDE.md "Migration from v1": map 1:1, backfill missing keys)', () => {
  it('round-trips a full v3 backup (with profile and plan) unchanged', () => {
    expect(normalizeBackup(withProfile, TODAY)).toEqual(withProfile);
  });

  it('gives a v2 backup with logs the legacy profile and plan, keeping every log', () => {
    const result = normalizeBackup(fullAppData, TODAY);
    expect(result).toMatchObject(fullAppData);
    expect(result.profile).toMatchObject({ heightCm: 166, startWeightKg: 80, goalWeightKg: 70 });
    expect(result.plan).toMatchObject({
      source: 'legacy',
      startDate: '2026-01-05',
      totalDays: 180,
    });
  });

  it('leaves profile and plan unset for a backup with no logs', () => {
    const result = normalizeBackup({ startDate: '2026-01-05' }, TODAY);
    expect(result.profile).toBeUndefined();
    expect(result.plan).toBeUndefined();
  });

  it('keeps the plan start date equal to the backup start date', () => {
    const result = normalizeBackup({ ...withProfile, startDate: '2026-02-02' }, TODAY);
    expect(result.plan?.startDate).toBe('2026-02-02');
  });

  it('rejects a backup whose plan is invalid', () => {
    const plan = { ...withProfile.plan, weekly: { ...withProfile.plan!.weekly, mon: 'Z' } };
    expect(() => normalizeBackup({ ...withProfile, plan }, TODAY)).toThrow();
  });

  it('backfills missing collections from a sparse v1-shaped export', () => {
    const v1Export = {
      startDate: '2026-01-05',
      startSet: true,
      weights: [{ date: '2026-01-05', kg: 80 }],
      done: { '2026-01-05': true },
      // measure, walks, nutrition, sets, rpe all absent, as an early v1 export might be
    };
    expect(normalizeBackup(v1Export, TODAY)).toEqual({
      profile: legacyProfile('2026-01-05', TODAY, expect.any(String)),
      plan: legacyPlan('2026-01-05', expect.any(String)),
      startDate: '2026-01-05',
      startSet: true,
      weights: [{ date: '2026-01-05', kg: 80 }],
      measure: [],
      done: { '2026-01-05': true },
      walks: {},
      nutrition: {},
      sets: {},
      rpe: {},
      favorites: [],
      lastBackup: undefined,
      backupSnoozeUntil: undefined,
    });
  });

  it('defaults startDate/startSet when absent, and drops v1-only fields like theme', () => {
    const legacyExport = { theme: 'dark' };
    const result = normalizeBackup(legacyExport);
    expect(result.startSet).toBe(true);
    expect(typeof result.startDate).toBe('string');
    expect(result).not.toHaveProperty('theme');
  });

  it('imports a v1 / pre-gallery backup without favorites as an empty list', () => {
    const preGallery: Partial<AppData> = { ...fullAppData };
    delete preGallery.favorites;
    expect(normalizeBackup(preGallery).favorites).toEqual([]);
    expect(appDataSchema.parse(preGallery).favorites).toEqual([]);
  });

  it('de-duplicates favorites and rejects non-string ids', () => {
    expect(normalizeBackup({ favorites: ['a', 'b', 'a'] }).favorites).toEqual(['a', 'b']);
    expect(() => normalizeBackup({ favorites: [1] })).toThrow();
  });

  it('rejects malformed data', () => {
    expect(() => normalizeBackup({ weights: [{ date: '2026-01-05', kg: 'eighty' }] })).toThrow();
  });
});
