import { createRequire } from 'node:module';
import { test, expect, type Page } from '@playwright/test';
import { seedProfile } from './fixtures/seedProfile';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: axeSource });
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (...args: unknown[]) => Promise<unknown> } })
      .axe;
    const result = (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })) as { violations: { id: string; nodes: unknown[] }[] };
    return result.violations.map((v) => `${v.id} ×${v.nodes.length}`);
  });
}

test('switch to a built-in plan and get its session in the workout', async ({ page }) => {
  // A Monday, so the new plan's first session is today's.
  await page.clock.setFixedTime(new Date(2026, 0, 5, 10, 0, 0));
  await seedProfile(page, {
    startDate: '2026-01-05',
    profile: { daysPerWeek: 4, injuries: [], experience: 'advanced' },
  });

  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: 'AI coach not connected' })).toBeVisible();
  await page.getByRole('button', { name: 'Use this plan: Hard' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Switch plan' }).click();
  await expect(page.getByText('Built-in · Hard')).toBeVisible();
  await expect(page.getByRole('row', { name: /Mon/ })).toContainText('Upper A');

  await page.reload();
  await expect(page.getByText('Built-in · Hard')).toBeVisible();

  await page.goto('/workout');
  await expect(page.getByRole('combobox', { name: 'Session' })).toHaveValue('UA');
});

for (const theme of ['dark', 'light'] as const) {
  test(`plan page passes axe in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((value) => {
      localStorage.setItem('fitpower-ui', JSON.stringify({ state: { theme: value }, version: 0 }));
    }, theme);
    await seedProfile(page);
    await page.goto('/plan');
    await expect(page.getByRole('heading', { name: 'Built-in plans' })).toBeVisible();
    await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    expect(await axeViolations(page)).toEqual([]);
  });
}
