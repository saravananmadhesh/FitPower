// Callbacks passed to page.evaluate() run in the browser, so this file needs the DOM lib.
/// <reference lib="dom" />
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { seedProfile } from './fixtures/seedProfile';

const STORE_KEY = 'fitpower-data';
const DRAFT_KEY = 'fitpower-onboarding-draft';

const next = (page: Page) => page.getByRole('button', { name: 'Continue' }).click();
const heading = (page: Page, name: string) =>
  expect(page.getByRole('heading', { level: 1, name })).toBeVisible();

async function fillAboutAndBody(page: Page) {
  await heading(page, 'About you');
  await page.getByLabel('Your name').fill('Alex');
  await page.getByLabel('Date of birth').fill('1994-03-15');
  await page.getByText('Female', { exact: true }).click();
  await next(page);

  await heading(page, 'Your body');
  await page.getByLabel('Height (cm)').fill('170');
  await page.getByLabel('Current weight (kg)').fill('78');
  await page.getByLabel('Goal weight (kg)').fill('68');
  await expect(page.getByText('Goal: lose 10 kg')).toBeVisible();
  await next(page);
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 16, 10, 0, 0));
});

test('a first-time visitor answers the questions and gets a plan to their target date', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/progress');
  await expect(page).toHaveURL(/\/onboarding$/);

  // Continue without answering shows inline errors and stays put.
  await page.getByLabel('Date of birth').fill('');
  await next(page);
  await expect(page.getByText('Choose an option')).toBeVisible();
  await heading(page, 'About you');

  await fillAboutAndBody(page);

  await heading(page, 'Your goal');
  await page.getByText('Lose fat', { exact: true }).click();
  await page.getByRole('button', { name: '12 weeks' }).click();
  await expect(page.getByText('Your plan: 84 days')).toBeVisible();
  await next(page);

  await heading(page, 'Training experience');
  await page.getByText('Beginner', { exact: true }).click();
  await next(page);

  await heading(page, 'Injuries and health');
  await page.getByLabel('Knee').check();
  await page.getByLabel('Side').selectOption('left');
  await page
    .getByLabel('A doctor has said I have a heart condition or high blood pressure')
    .check();
  await expect(page.getByText('Please check with a doctor first')).toBeVisible();
  await page.getByLabel('A doctor has cleared me to exercise').check();
  await next(page);

  await heading(page, 'Lifestyle');
  const diet = page.getByRole('group', { name: 'How would you rate your diet?' });
  await diet.getByText('3', { exact: true }).click();
  const health = page.getByRole('group', { name: 'How would you rate your overall health?' });
  await health.getByText('4', { exact: true }).click();
  await page.getByText('4 days', { exact: true }).click();
  await page.getByText('30 min', { exact: true }).click();
  await next(page);

  await heading(page, 'Choose your plan');
  // Beginner with a knee injury → Easy is recommended and pre-selected.
  const easy = page.locator('label', { hasText: 'Easy' });
  await expect(easy.getByText('Recommended')).toBeVisible();
  await expect(easy.getByRole('radio')).toBeChecked();
  await expect(page.getByText('AI coach not connected')).toBeVisible();
  await page.getByRole('button', { name: 'Create my plan' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Your plan is ready')).toBeVisible();

  const saved = await page.evaluate(
    ([key, draftKey]) => ({
      data: JSON.parse(localStorage.getItem(key) ?? '{}').state,
      draft: JSON.parse(localStorage.getItem(draftKey) ?? '{}').state?.draft ?? null,
    }),
    [STORE_KEY, DRAFT_KEY],
  );
  expect(saved.draft).toBeNull();
  expect(saved.data.profile).toMatchObject({
    name: 'Alex',
    sex: 'female',
    heightCm: 170,
    startWeightKg: 78,
    goalWeightKg: 68,
    goalType: 'fat-loss',
    experience: 'beginner',
    daysPerWeek: 4,
    minutesPerSession: 30,
    injuries: [{ area: 'knee', side: 'left', note: '' }],
    health: { clearedByDoctor: true },
  });
  expect(saved.data.profile.health.conditions).toContain('heart condition');
  expect(saved.data.plan).toMatchObject({
    source: 'builtin-easy',
    startDate: '2026-10-17',
    totalDays: 84,
  });
  expect(saved.data.plan.phases.at(-1).endDay).toBe(84);
  expect(
    Object.values(saved.data.plan.weekly).filter((s) => s !== 'walk' && s !== 'rest'),
  ).toHaveLength(4);

  expect(errors).toEqual([]);
});

test('closing the tab mid-way resumes on the same step with answers kept', async ({ page }) => {
  await page.goto('/onboarding');
  await fillAboutAndBody(page);
  await heading(page, 'Your goal');

  await page.reload();
  await heading(page, 'Your goal');
  await page.getByRole('button', { name: 'Back' }).click();
  await heading(page, 'Your body');
  await expect(page.getByLabel('Height (cm)')).toHaveValue('170');
});

test('the wizard is keyboard operable', async ({ page }) => {
  await page.goto('/onboarding');
  await heading(page, 'About you');
  await page.getByLabel('Your name').focus();
  await page.keyboard.type('Sam');
  // Native date inputs tab between their own segments, so fill this one directly.
  await page.getByLabel('Date of birth').fill('1990-03-15');
  await page.getByRole('radio', { name: 'Male', exact: true }).focus();
  // Arrow keys move within the radio group.
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Female' })).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
  await page.keyboard.press('Enter');
  await heading(page, 'Your body');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('with an AI key saved, "Design with AI instead" saves the plan and starts the coach interview', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'fitpower-ai-key',
      JSON.stringify({
        provider: 'anthropic',
        apiKey: 'sk-ant-e2e-not-a-real-key',
        model: 'claude-sonnet-5-5',
        baseUrl: 'https://api.anthropic.com',
        savedAt: '2026-10-16T09:00:00.000Z',
      }),
    );
  });
  const requests: unknown[] = [];
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        content: [{ type: 'text', text: 'Great, which days of the week suit you?' }],
        stop_reason: 'end_turn',
      }),
    });
  });

  await page.goto('/onboarding');
  await fillAboutAndBody(page);
  await heading(page, 'Your goal');
  await page.getByText('Build muscle', { exact: true }).click();
  await next(page);
  await heading(page, 'Training experience');
  await page.getByText('Intermediate', { exact: true }).click();
  await next(page);
  await heading(page, 'Injuries and health');
  await next(page);
  await heading(page, 'Lifestyle');
  for (const name of ['How would you rate your diet?', 'How would you rate your overall health?']) {
    await page.getByRole('group', { name }).getByText('4', { exact: true }).click();
  }
  await page.getByText('3 days', { exact: true }).click();
  await page.getByText('45 min', { exact: true }).click();
  await next(page);

  await heading(page, 'Choose your plan');
  await expect(page.getByText('Design with AI', { exact: true })).toBeVisible();
  await expect(page.getByText('AI coach not connected')).toHaveCount(0);
  await page.getByRole('button', { name: 'Design with AI instead' }).click();

  await expect(page).toHaveURL(/\/coach$/);
  await expect(page.getByText('Great, which days of the week suit you?')).toBeVisible();
  expect(requests).toHaveLength(1);

  const data = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}').state,
    STORE_KEY,
  );
  expect(data.profile.name).toBe('Alex');
  expect(data.plan.source).toBe('builtin-intermediate');
});

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

/** Runs axe-core (WCAG 2.1 A/AA rules) in the page and returns a compact violation list. */
async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: axeSource });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (...args: unknown[]) => Promise<unknown> } })
      .axe;
    const result = (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })) as { violations: { id: string; impact: string | null; nodes: { target: string[] }[] }[] };
    return result.violations;
  });
  return violations.map(
    (v) => `${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`,
  );
}

for (const theme of ['dark', 'light'] as const) {
  test(`every step passes axe (WCAG 2.1 A/AA) in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((value) => {
      localStorage.setItem('fitpower-ui', JSON.stringify({ state: { theme: value }, version: 0 }));
    }, theme);
    await page.goto('/onboarding');
    await heading(page, 'About you');
    await expect(page.locator('html')).toHaveClass(new RegExp(theme));

    // Errors showing, then each filled step.
    await next(page);
    await expect(page.getByText('Choose an option')).toBeVisible();
    expect(await axeViolations(page), 'about with errors').toEqual([]);
    await fillAboutAndBody(page);

    await heading(page, 'Your goal');
    await page.getByText('Lose fat', { exact: true }).click();
    expect(await axeViolations(page), 'goal').toEqual([]);
    await next(page);

    await heading(page, 'Training experience');
    await page.getByText('Beginner', { exact: true }).click();
    expect(await axeViolations(page), 'experience').toEqual([]);
    await next(page);

    await heading(page, 'Injuries and health');
    await page.getByLabel('Knee').check();
    await page
      .getByLabel('A doctor has said I have a heart condition or high blood pressure')
      .check();
    expect(await axeViolations(page), 'health').toEqual([]);
    await next(page);

    await heading(page, 'Lifestyle');
    await page.getByRole('group', { name: 'How would you rate your diet?' }).getByText('3').click();
    await page
      .getByRole('group', { name: 'How would you rate your overall health?' })
      .getByText('4')
      .click();
    await page.getByText('3 days', { exact: true }).click();
    await page.getByText('45 min', { exact: true }).click();
    expect(await axeViolations(page), 'lifestyle').toEqual([]);
    await next(page);

    await heading(page, 'Choose your plan');
    expect(await axeViolations(page), 'plan').toEqual([]);
  });
}

test('retaking setup keeps the running program and can be cancelled', async ({ page }) => {
  // 40 days into a program, with a newer weight logged.
  await seedProfile(page, { startDate: '2026-09-06' });
  await page.addInitScript(() => {
    const raw = localStorage.getItem('fitpower-data');
    if (!raw || raw.includes('76.2')) return;
    const stored = JSON.parse(raw);
    stored.state.weights = [{ date: '2026-10-10', kg: 76.2 }];
    localStorage.setItem('fitpower-data', JSON.stringify(stored));
  });

  await page.goto('/onboarding');
  await heading(page, 'About you');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  await page.getByRole('button', { name: 'Redo setup' }).click();
  await heading(page, 'About you');
  await next(page);
  await heading(page, 'Your body');
  await expect(page.getByLabel('Current weight (kg)')).toHaveValue('76.2');
  await next(page);
  await heading(page, 'Your goal');
  await expect(page.getByLabel('Start date')).toHaveValue('2026-09-06');
  for (const step of ['Your goal', 'Training experience', 'Injuries and health', 'Lifestyle']) {
    await heading(page, step);
    await next(page);
  }

  await heading(page, 'Choose your plan');
  await expect(page.getByText(/keeps its start date/)).toBeVisible();
  await page.getByRole('button', { name: 'Create my plan' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Day 41 of 180')).toBeVisible();
  // "kg lost" still counts from the original 80 kg start.
  await expect(page.getByText('-3.8 kg', { exact: true })).toBeVisible();
});

test('reset everything also drops a half-finished setup', async ({ page }) => {
  await seedProfile(page);
  await page.goto('/onboarding');
  await page.getByLabel('Your name').fill('Old Name');
  await next(page);
  await heading(page, 'Your body');

  // Leave setup mid-way, then reset from Settings.
  await page.goto('/settings');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Reset everything' }).click();
  await expect(page.getByText('All data has been reset')).toBeVisible();

  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  await heading(page, 'About you');
  await expect(page.getByLabel('Your name')).toHaveValue('');
});
