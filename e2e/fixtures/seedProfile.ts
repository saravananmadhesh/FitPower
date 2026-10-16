import type { Page } from '@playwright/test';
import { formatISO } from '../../src/domain/dates';
import { legacyPlan, legacyProfile } from '../../src/domain/plans/legacy';
import type { TrainingPlan, UserProfile } from '../../src/types';

/** Must match `APP_STORE_KEY` / `APP_STORE_VERSION` in src/store/useAppStore.ts. */
const STORE_KEY = 'fitpower-data';
const STORE_VERSION = 3;

export interface SeedOptions {
  /** Program day 1 (YYYY-MM-DD). Default: today. */
  startDate?: string;
  profile?: Partial<UserProfile>;
  plan?: Partial<TrainingPlan>;
}

/**
 * Writes a profile and plan into the app's persisted store before the page's
 * scripts run, so specs skip first-run onboarding. Only seeds when the store
 * is empty, so reloads keep whatever the test changed.
 */
export async function seedProfile(page: Page, options: SeedOptions = {}): Promise<void> {
  const today = formatISO(new Date());
  const startDate = options.startDate ?? today;
  const state = {
    startDate,
    startSet: true,
    weights: [],
    measure: [],
    done: {},
    walks: {},
    nutrition: {},
    sets: {},
    rpe: {},
    favorites: [],
    profile: { ...legacyProfile(startDate, today), ...options.profile },
    plan: { ...legacyPlan(startDate), ...options.plan, startDate },
  };
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: STORE_KEY, value: JSON.stringify({ state, version: STORE_VERSION }) },
  );
}
