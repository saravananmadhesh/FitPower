import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppData,
  DayNutrition,
  Measurement,
  Rpe,
  SetLog,
  TrainingPlan,
  UserProfile,
  WeightEntry,
} from '@/types';
import { todayISO } from '@/domain/dates';
import { hasUserData } from '@/domain/schema';
import { legacyPlan, legacyProfile } from '@/domain/plans/legacy';

function initialAppData(): AppData {
  return {
    // Deliberate deviation from v1 (which defaulted day 1 to tomorrow, so
    // "today" started as day 0): a fresh install starts the program today.
    startDate: todayISO(),
    startSet: true,
    weights: [],
    measure: [],
    done: {},
    walks: {},
    nutrition: {},
    sets: {},
    rpe: {},
    favorites: [],
    lastBackup: undefined,
    backupSnoozeUntil: undefined,
    profile: undefined,
    plan: undefined,
  };
}

function emptyNutritionDay(): DayNutrition {
  return { kcal: 0, pro: 0, water: 0, steps: 0 };
}

function byDateAsc<T extends { date: string }>(a: T, b: T): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

interface AppDataState extends AppData {
  setStartDate: (date: string) => void;
  saveProfile: (profile: UserProfile) => void;
  savePlan: (plan: TrainingPlan) => void;
  saveWeight: (entry: WeightEntry) => void;
  deleteWeight: (date: string) => void;
  saveMeasurement: (entry: Measurement) => void;
  deleteMeasurement: (date: string) => void;
  toggleDone: (date: string) => void;
  markDone: (date: string) => void;
  toggleWalk: (date: string) => void;
  saveSet: (date: string, exerciseName: string, set: SetLog) => void;
  setRpe: (date: string, rpe: Rpe) => void;
  toggleFavorite: (exerciseId: string) => void;
  addNutrition: (date: string, field: 'kcal' | 'pro' | 'water', amount: number) => void;
  setSteps: (date: string, steps: number) => void;
  resetNutritionDay: (date: string) => void;
  setLastBackup: (date: string) => void;
  setBackupSnooze: (date: string | undefined) => void;
  importAppData: (data: AppData) => void;
  reset: () => void;
}

export const APP_STORE_KEY = 'fitpower-data';

/**
 * v1 → v2: added `favorites` (Workout Gallery).
 * v2 → v3: added `profile` and `plan`; installs with data get the legacy ones.
 */
export const APP_STORE_VERSION = 3;

/**
 * Upgrades a persisted snapshot from an older `version` to the current shape.
 * Only the data fields are persisted-relevant; zustand merges the result over
 * the live store, so actions are untouched.
 */
export function migrateAppStore(persisted: unknown, version: number): AppData {
  const state: AppData = { ...initialAppData(), ...(persisted as Partial<AppData> | null) };
  if (version < 2 && !Array.isArray(state.favorites)) state.favorites = [];
  if (version < 3 && !state.profile && !state.plan && hasUserData(state)) {
    state.profile = legacyProfile(state.startDate, todayISO());
    state.plan = legacyPlan(state.startDate);
  }
  return state;
}

export const useAppStore = create<AppDataState>()(
  persist(
    (set) => ({
      ...initialAppData(),

      setStartDate: (date) =>
        set((s) => ({
          startDate: date,
          startSet: true,
          plan: s.plan ? { ...s.plan, startDate: date } : s.plan,
        })),

      saveProfile: (profile) => set({ profile }),

      // The plan's start date is the program's day 1.
      savePlan: (plan) => set({ plan, startDate: plan.startDate, startSet: true }),

      saveWeight: (entry) =>
        set((s) => ({
          weights: [...s.weights.filter((w) => w.date !== entry.date), entry].sort(byDateAsc),
        })),

      deleteWeight: (date) => set((s) => ({ weights: s.weights.filter((w) => w.date !== date) })),

      saveMeasurement: (entry) =>
        set((s) => ({
          measure: [...s.measure.filter((m) => m.date !== entry.date), entry].sort(byDateAsc),
        })),

      deleteMeasurement: (date) =>
        set((s) => ({ measure: s.measure.filter((m) => m.date !== date) })),

      toggleDone: (date) =>
        set((s) => {
          const done = { ...s.done };
          if (done[date]) delete done[date];
          else done[date] = true;
          return { done };
        }),

      markDone: (date) => set((s) => ({ done: { ...s.done, [date]: true } })),

      toggleWalk: (date) =>
        set((s) => {
          const walks = { ...s.walks };
          if (walks[date]) delete walks[date];
          else walks[date] = true;
          return { walks };
        }),

      saveSet: (date, exerciseName, setLog) =>
        set((s) => ({
          sets: {
            ...s.sets,
            [date]: { ...(s.sets[date] ?? {}), [exerciseName]: setLog },
          },
        })),

      setRpe: (date, rpe) => set((s) => ({ rpe: { ...s.rpe, [date]: rpe } })),

      toggleFavorite: (exerciseId) =>
        set((s) => ({
          favorites: s.favorites.includes(exerciseId)
            ? s.favorites.filter((id) => id !== exerciseId)
            : [...s.favorites, exerciseId],
        })),

      addNutrition: (date, field, amount) =>
        set((s) => {
          const day = s.nutrition[date] ?? emptyNutritionDay();
          return {
            nutrition: { ...s.nutrition, [date]: { ...day, [field]: day[field] + amount } },
          };
        }),

      setSteps: (date, steps) =>
        set((s) => {
          const day = s.nutrition[date] ?? emptyNutritionDay();
          return { nutrition: { ...s.nutrition, [date]: { ...day, steps } } };
        }),

      resetNutritionDay: (date) =>
        set((s) => ({ nutrition: { ...s.nutrition, [date]: emptyNutritionDay() } })),

      setLastBackup: (date) => set({ lastBackup: date, backupSnoozeUntil: undefined }),

      setBackupSnooze: (date) => set({ backupSnoozeUntil: date }),

      // A backup without a profile/plan (e.g. an empty one) keeps the current ones.
      importAppData: (data) =>
        set((s) => {
          const plan = data.plan ?? s.plan;
          return {
            ...data,
            profile: data.profile ?? s.profile,
            plan: plan ? { ...plan, startDate: data.startDate } : plan,
          };
        }),

      reset: () => set({ ...initialAppData() }),
    }),
    {
      name: APP_STORE_KEY,
      version: APP_STORE_VERSION,
      migrate: (persisted, version) => migrateAppStore(persisted, version) as AppDataState,
    },
  ),
);

/** Strips actions, leaving only the persisted AppData shape. */
export function selectAppData(state: AppDataState): AppData {
  return {
    startDate: state.startDate,
    startSet: state.startSet,
    weights: state.weights,
    measure: state.measure,
    done: state.done,
    walks: state.walks,
    nutrition: state.nutrition,
    sets: state.sets,
    rpe: state.rpe,
    favorites: state.favorites,
    lastBackup: state.lastBackup,
    backupSnoozeUntil: state.backupSnoozeUntil,
    profile: state.profile,
    plan: state.plan,
  };
}
