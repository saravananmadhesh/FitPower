import { test, expect } from '@playwright/test';
import { seedProfile } from './fixtures/seedProfile';

// Pin "today" to a lifting day (Monday = session A). On walk days (Tue/Thu/
// Sat/Sun in the 3-day program) completing the day doesn't count toward the
// streak, so with the real clock this test would only pass on Mon/Wed/Fri.
const TODAY = '2026-01-05';

test('log weight, complete a workout, and see both reflected on the dashboard', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.clock.setFixedTime(new Date(2026, 0, 5, 10, 0, 0));
  const today = TODAY;
  // Seed a start date in the past, then move day 1 to today in Settings so
  // marking today complete has a visible effect (streak, week count).
  await seedProfile(page, { startDate: '2025-12-01' });

  await page.goto('/settings');
  await page.locator('input[type="date"]').first().fill(today);

  // Log today's weight.
  await page.goto('/progress');
  await page.getByLabel('Weight (kg)').fill('78.5');
  await page.getByRole('button', { name: 'Save weight' }).click();
  await expect(page.locator('table')).toContainText('78.5 kg');

  // Do the workout and mark it complete.
  await page.goto('/workout');
  await page.getByRole('button', { name: 'Mark today complete' }).click();
  await expect(page.getByText('Completed')).toBeVisible();

  // Dashboard reflects the new weight and today's completion.
  await page.goto('/');
  await expect(page.getByText('78.5 kg')).toBeVisible();

  // "Day streak" appears twice (the stat card and the streak widget) — the
  // stat card is first in DOM order; its value sits in the same wrapper div.
  const streakLabel = page.getByText('Day streak', { exact: true }).first();
  await expect(streakLabel.locator('..')).toContainText('1');

  expect(errors).toEqual([]);
});

// First-run onboarding is covered by e2e/onboarding.spec.ts.

test('an install from before profiles keeps its data and skips onboarding', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 0, 5, 10, 0, 0));
  await page.addInitScript(() => {
    const v2State = {
      startDate: '2026-01-05',
      startSet: true,
      weights: [{ date: '2026-01-05', kg: 77.4 }],
      measure: [],
      done: {},
      walks: {},
      nutrition: {},
      sets: {},
      rpe: {},
      favorites: [],
    };
    if (!localStorage.getItem('fitpower-data')) {
      localStorage.setItem('fitpower-data', JSON.stringify({ state: v2State, version: 2 }));
    }
  });

  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('77.4 kg')).toBeVisible();
  // The migrated legacy profile keeps the old 80 kg start and 70 kg goal:
  // down 2.6 kg, 7.4 kg to go.
  await expect(page.getByText('-2.6 kg', { exact: true })).toBeVisible();
  await expect(page.getByText('7.4 kg', { exact: true })).toBeVisible();
});
