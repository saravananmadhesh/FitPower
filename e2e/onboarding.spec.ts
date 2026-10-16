import { expect, test, type Page } from '@playwright/test';

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
