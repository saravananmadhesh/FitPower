// Callbacks passed to page.evaluate() run in the browser, so this file needs the DOM lib.
/// <reference lib="dom" />
import { createRequire } from 'node:module';
import { test, expect, type Page } from '@playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

interface AxeViolation {
  id: string;
  impact: string | null;
  nodes: { target: string[] }[];
}

/** Runs axe-core (WCAG 2.1 A/AA rules) in the page and returns a compact violation list. */
async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: axeSource });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (...args: unknown[]) => Promise<unknown> } })
      .axe;
    const result = (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })) as { violations: AxeViolation[] };
    return result.violations;
  });
  return violations.map(
    (v) => `${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`,
  );
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('browse to an exercise, favorite it, and find it in Favorites after a reload', async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.goto('/');
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByText('Gallery').click();
  await expect(page).toHaveURL(/\/gallery$/);

  await page.getByRole('link', { name: /^Arms/ }).click();
  await page.getByRole('tab', { name: 'Biceps' }).click();
  await expect(page).toHaveURL(/\/gallery\/arms\?sub=biceps$/);

  await page.getByRole('link', { name: /^Dumbbell Bicep Curl,/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Dumbbell Bicep Curl' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Watch on YouTube' })).toBeVisible();

  await dialog.getByRole('button', { name: 'Favorite Dumbbell Bicep Curl' }).click();
  await expect(
    dialog.getByRole('button', { name: 'Favorite Dumbbell Bicep Curl', pressed: true }),
  ).toBeVisible();

  // Back to the album (same sub-album), then up to the gallery home.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/gallery\/arms\?sub=biceps$/);
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link').click();

  await page.getByRole('link', { name: /^Favorites/ }).click();
  const favorites = page.getByRole('list', { name: 'Exercises' }).getByRole('article');
  await expect(favorites).toHaveCount(1);
  await expect(favorites).toContainText('Dumbbell Bicep Curl');

  await page.reload();
  await expect(favorites).toHaveCount(1);
  await expect(favorites).toContainText('Dumbbell Bicep Curl');

  expect(errors).toEqual([]);
});

for (const theme of ['dark', 'light'] as const) {
  test(`gallery screens pass axe (WCAG 2.1 A/AA) in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((value) => {
      localStorage.setItem('fitpower-ui', JSON.stringify({ state: { theme: value }, version: 0 }));
    }, theme);

    await page.goto('/gallery');
    await expect(page.getByRole('list', { name: 'Albums' })).toBeVisible();
    await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    expect(await axeViolations(page), 'gallery home').toEqual([]);

    await page.goto('/gallery/legs');
    await expect(page.getByRole('list', { name: 'Exercises' })).toBeVisible();
    expect(await axeViolations(page), 'album view').toEqual([]);

    await page.goto('/gallery/legs/Split_Squat_with_Dumbbells');
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await axeViolations(page), 'exercise detail').toEqual([]);
  });
}

test('the gallery works offline after the first load', async ({ page, context }) => {
  await page.goto('/gallery');
  await expect(page.getByRole('list', { name: 'Albums' })).toBeVisible();

  // Wait for the service worker to take control and finish precaching
  // (app shell + the 364 demo images).
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const keys = await caches.keys();
          const sizes = await Promise.all(
            keys.map(async (key) => (await (await caches.open(key)).keys()).length),
          );
          return sizes.reduce((a, b) => a + b, 0);
        }),
      { timeout: 60_000 },
    )
    .toBeGreaterThan(364);

  await context.setOffline(true);
  await page.reload();
  await page.getByRole('link', { name: /^Shoulders/ }).click();
  const cards = page.getByRole('list', { name: 'Exercises' }).getByRole('article');
  await expect(cards).toHaveCount(49);

  // Demo images come from the precache, not the network.
  const firstImage = cards.first().locator('img').first();
  await expect
    .poll(() =>
      firstImage.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0)),
    )
    .toBeGreaterThan(0);

  await cards.first().getByRole('link').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'How to' })).toBeVisible();
});
