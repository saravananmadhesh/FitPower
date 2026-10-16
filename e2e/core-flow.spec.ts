import { test, expect } from '@playwright/test';

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

  // A fresh install defaults the program start date to tomorrow, so "today"
  // wouldn't count toward any program-day math yet. Start the program today
  // so marking it complete has a visible effect (streak, week count).
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
