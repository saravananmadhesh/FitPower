import { beforeEach, describe, expect, it } from 'vitest';
import {
  APP_STORE_KEY,
  APP_STORE_VERSION,
  migrateAppStore,
  useAppStore,
} from '@/store/useAppStore';
import { apiRepository } from './apiRepository';
import { localRepository } from './localRepository';

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
    expect(APP_STORE_VERSION).toBe(2);
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
});
