import { beforeEach, describe, expect, it } from 'vitest';
import {
  APP_STORE_KEY,
  APP_STORE_VERSION,
  migrateAppStore,
  useAppStore,
} from '@/store/useAppStore';
import { apiRepository } from './apiRepository';
import { localRepository } from './localRepository';
import { legacyPlan, legacyProfile } from '@/domain/plans/legacy';

function persisted(): { state: Record<string, unknown>; version: number } {
  return JSON.parse(localStorage.getItem(APP_STORE_KEY) ?? 'null');
}

beforeEach(async () => {
  await localRepository.reset();
});

describe('favorites (store + localRepository)', () => {
  it('starts empty', async () => {
    expect((await localRepository.getAppData()).favorites).toEqual([]);
  });

  it('toggleFavorite adds, keeps insertion order, and removes on a second toggle', async () => {
    await localRepository.toggleFavorite('DB_Goblet_Squat');
    await localRepository.toggleFavorite('Hammer_Curls');
    expect((await localRepository.getAppData()).favorites).toEqual([
      'DB_Goblet_Squat',
      'Hammer_Curls',
    ]);

    await localRepository.toggleFavorite('DB_Goblet_Squat');
    expect((await localRepository.getAppData()).favorites).toEqual(['Hammer_Curls']);
  });

  it('persists favorites to localStorage under the bumped store version', async () => {
    await localRepository.toggleFavorite('DB_Goblet_Squat');
    expect(persisted().version).toBe(APP_STORE_VERSION);
    expect(APP_STORE_VERSION).toBe(3);
    expect(persisted().state.favorites).toEqual(['DB_Goblet_Squat']);
  });

  it('survives a reload (rehydrates from localStorage)', async () => {
    await localRepository.toggleFavorite('DB_Goblet_Squat');
    const snapshot = localStorage.getItem(APP_STORE_KEY)!;

    useAppStore.setState({ favorites: [] });
    localStorage.setItem(APP_STORE_KEY, snapshot);
    await useAppStore.persist.rehydrate();

    expect((await localRepository.getAppData()).favorites).toEqual(['DB_Goblet_Squat']);
  });

  it('reset clears favorites', async () => {
    await localRepository.toggleFavorite('DB_Goblet_Squat');
    expect((await localRepository.reset()).favorites).toEqual([]);
  });
});

describe('persist migration v1 → v2', () => {
  const v1State = {
    startDate: '2026-01-05',
    startSet: true,
    weights: [{ date: '2026-01-05', kg: 80 }],
    measure: [],
    done: { '2026-01-05': true },
    walks: {},
    nutrition: {},
    sets: { '2026-01-05': { 'DB floor press': { w: 8, reps: 10 } } },
    rpe: {},
  };

  it('backfills favorites and keeps every existing log', () => {
    expect(migrateAppStore(v1State, 1)).toMatchObject({ ...v1State, favorites: [] });
  });

  it('tolerates a missing snapshot', () => {
    expect(migrateAppStore(null, 1).favorites).toEqual([]);
  });

  it('rehydrates a v1 snapshot already in localStorage without losing data', async () => {
    localStorage.setItem(APP_STORE_KEY, JSON.stringify({ state: v1State, version: 1 }));
    await useAppStore.persist.rehydrate();

    const data = await localRepository.getAppData();
    expect(data.favorites).toEqual([]);
    expect(data.weights).toEqual(v1State.weights);
    expect(data.sets).toEqual(v1State.sets);

    // ...and the store still works after migrating.
    await localRepository.toggleFavorite('Hammer_Curls');
    expect((await localRepository.getAppData()).favorites).toEqual(['Hammer_Curls']);
  });
});

describe('persist migration v2 → v3 (profile + plan)', () => {
  const v2State = {
    startDate: '2026-01-05',
    startSet: true,
    weights: [{ date: '2026-01-05', kg: 78 }],
    measure: [],
    done: { '2026-01-05': true },
    walks: {},
    nutrition: {},
    sets: {},
    rpe: {},
    favorites: ['Hammer_Curls'],
  };

  it('gives an install with data the legacy profile and plan, keeping every log', () => {
    const migrated = migrateAppStore(v2State, 2);
    expect(migrated).toMatchObject(v2State);
    expect(migrated.profile).toMatchObject({ heightCm: 166, startWeightKg: 80, goalWeightKg: 70 });
    expect(migrated.plan).toMatchObject({ source: 'legacy', startDate: '2026-01-05' });
  });

  it('leaves an empty install without a profile, so it goes through onboarding', () => {
    const migrated = migrateAppStore({ ...v2State, weights: [], done: {}, favorites: [] }, 2);
    expect(migrated.profile).toBeUndefined();
    expect(migrated.plan).toBeUndefined();
  });

  it('migrates a v1 snapshot straight through to v3', () => {
    const v1State: Partial<typeof v2State> = { ...v2State };
    delete v1State.favorites;
    expect(migrateAppStore(v1State, 1)).toMatchObject({
      favorites: [],
      plan: { source: 'legacy' },
    });
  });
});

describe('profile and plan (store + localRepository)', () => {
  it('start out unset', async () => {
    expect(await localRepository.getProfile()).toBeNull();
    expect(await localRepository.getPlan()).toBeNull();
  });

  it('saves and persists both', async () => {
    const profile = legacyProfile('2026-01-05', '2026-10-16');
    await localRepository.saveProfile({ ...profile, name: 'Alex' });
    await localRepository.savePlan(legacyPlan('2026-03-02'));
    expect((await localRepository.getProfile())?.name).toBe('Alex');
    expect(persisted().state.profile).toMatchObject({ name: 'Alex' });
    // The plan's start date becomes the program's day 1.
    expect((await localRepository.getAppData()).startDate).toBe('2026-03-02');
  });

  it('rejects an invalid profile or plan without storing it', async () => {
    const profile = legacyProfile('2026-01-05', '2026-10-16');
    await expect(localRepository.saveProfile({ ...profile, heightCm: 5 })).rejects.toThrow();
    const plan = legacyPlan('2026-01-05');
    await expect(
      localRepository.savePlan({ ...plan, weekly: { ...plan.weekly, mon: 'nope' } }),
    ).rejects.toThrow();
    expect(await localRepository.getProfile()).toBeNull();
    expect(await localRepository.getPlan()).toBeNull();
  });

  it('moves the plan with the start date', async () => {
    await localRepository.savePlan(legacyPlan('2026-01-05'));
    await localRepository.setStartDate('2026-02-01');
    expect((await localRepository.getPlan())?.startDate).toBe('2026-02-01');
  });

  it('round-trips through a backup, and a profile-less empty backup keeps the current ones', async () => {
    await localRepository.saveProfile({
      ...legacyProfile('2026-01-05', '2026-10-16'),
      name: 'Alex',
    });
    await localRepository.savePlan(legacyPlan('2026-01-05'));
    const backup: unknown = JSON.parse(JSON.stringify(await localRepository.exportBackup()));
    await localRepository.reset();
    expect(await localRepository.getProfile()).toBeNull();

    await localRepository.importBackup(backup);
    expect((await localRepository.getProfile())?.name).toBe('Alex');

    await localRepository.importBackup({ startDate: '2026-04-06' });
    expect((await localRepository.getProfile())?.name).toBe('Alex');
    expect((await localRepository.getPlan())?.startDate).toBe('2026-04-06');
  });
});

describe('backup with favorites', () => {
  it('round-trips export → reset → import', async () => {
    await localRepository.saveWeight({ date: '2026-01-05', kg: 80 });
    await localRepository.toggleFavorite('DB_Goblet_Squat');
    await localRepository.toggleFavorite('Hammer_Curls');

    // Through JSON, exactly as the Settings export/import file does.
    const backup: unknown = JSON.parse(JSON.stringify(await localRepository.exportBackup()));
    await localRepository.reset();
    const imported = await localRepository.importBackup(backup);

    expect(imported.favorites).toEqual(['DB_Goblet_Squat', 'Hammer_Curls']);
    expect(await localRepository.getAppData()).toMatchObject({
      favorites: ['DB_Goblet_Squat', 'Hammer_Curls'],
      weights: [{ date: '2026-01-05', kg: 80 }],
    });
  });

  it('importing a v1 backup (no favorites field) yields [] and replaces existing favorites', async () => {
    await localRepository.toggleFavorite('DB_Goblet_Squat');
    const v1Backup = {
      startDate: '2026-01-05',
      startSet: true,
      weights: [{ date: '2026-01-05', kg: 80 }],
      done: { '2026-01-05': true },
      theme: 'dark',
    };

    const imported = await localRepository.importBackup(v1Backup);

    expect(imported.favorites).toEqual([]);
    expect((await localRepository.getAppData()).favorites).toEqual([]);
    expect((await localRepository.getAppData()).done).toEqual({ '2026-01-05': true });
  });
});

describe('apiRepository stub', () => {
  it('exposes toggleFavorite on the same interface (not implemented yet)', () => {
    expect(() => apiRepository.toggleFavorite('DB_Goblet_Squat')).toThrow(/not implemented/);
  });

  it('exposes the profile and plan methods too', () => {
    expect(() => apiRepository.getProfile()).toThrow(/not implemented/);
    expect(() => apiRepository.savePlan(legacyPlan('2026-01-05'))).toThrow(/not implemented/);
  });
});
