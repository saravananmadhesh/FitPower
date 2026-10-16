// Callbacks passed to page.evaluate() run in the browser, so this file needs the DOM lib.
/// <reference lib="dom" />
import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Captures the screenshots used in README.md. Run with `npm run screenshots`.
 * A demo user ("Alex") goes through onboarding, then four weeks of made-up
 * logs are written so the dashboard and charts have something to show.
 * No real AI is called: the coach replies are scripted.
 */

const OUT = 'docs/screenshots';
const STORE_KEY = 'fitpower-data';
const UI_KEY = 'fitpower-ui';
const NOW = new Date(2026, 9, 16, 9, 30, 0);
/** Today is day 29 of the plan in the demo. */
const DAYS_IN = 28;

const shot = (page: Page, name: string, fullPage = false) =>
  page.screenshot({ path: `${OUT}/${name}.png`, fullPage, animations: 'disabled' });

const next = (page: Page) => page.getByRole('button', { name: 'Continue' }).click();

async function setTheme(page: Page, theme: 'dark' | 'light') {
  await page.evaluate(
    ([key, t]) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          state: { theme: t, density: 'comfortable', sidebarCollapsed: false },
          version: 0,
        }),
      );
    },
    [UI_KEY, theme],
  );
}

/** Answers the first-run questions and captures a few steps on the way. */
async function onboard(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Your name').fill('Alex');
  await page.getByLabel('Date of birth').fill('1994-03-15');
  await page.getByText('Female', { exact: true }).click();
  await shot(page, 'onboarding-about');
  await next(page);

  await page.getByLabel('Height (cm)').fill('170');
  await page.getByLabel('Current weight (kg)').fill('78');
  await page.getByLabel('Goal weight (kg)').fill('70');
  await next(page);

  await page.getByText('Lose fat', { exact: true }).click();
  await page.getByRole('button', { name: '6 months' }).click();
  await shot(page, 'onboarding-goal');
  await next(page);

  await page.getByText('Intermediate', { exact: true }).click();
  await next(page);

  await page.getByLabel('Knee').check();
  await page.getByLabel('Side').selectOption('left');
  await shot(page, 'onboarding-health');
  await next(page);

  const diet = page.getByRole('group', { name: 'How would you rate your diet?' });
  await diet.getByText('3', { exact: true }).click();
  const health = page.getByRole('group', { name: 'How would you rate your overall health?' });
  await health.getByText('4', { exact: true }).click();
  await page.getByText('3 days', { exact: true }).click();
  await page.getByText('45 min', { exact: true }).click();
  await next(page);

  await page.locator('label', { hasText: 'Intermediate' }).click();
  await shot(page, 'onboarding-plan');
  await page.getByRole('button', { name: 'Create my plan' }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Moves the plan start back four weeks and fills it with plausible logs. */
async function addHistory(page: Page) {
  await page.evaluate(
    ([key, daysIn, nowMs]) => {
      const iso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const now = new Date(nowMs);
      const day = (offset: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() + offset);
        return d;
      };
      const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const stored = JSON.parse(localStorage.getItem(key) ?? '{}');
      const s = stored.state;
      const start = iso(day(-daysIn));
      s.startDate = start;
      s.plan.startDate = start;
      if (s.profile) s.profile.targetDate = iso(day(-daysIn + s.plan.totalDays - 1));

      const weights = [];
      const done: Record<string, boolean> = {};
      const walks: Record<string, boolean> = {};
      const nutrition: Record<string, unknown> = {};
      const rpe: Record<string, string> = {};
      for (let i = -daysIn; i < 0; i++) {
        const d = day(i);
        const key = iso(d);
        const slot = s.plan.weekly[weekdays[d.getDay()]];
        if (slot === 'walk') {
          if (i % 5 !== 0) walks[key] = true;
        } else if (slot !== 'rest' && i !== -12) {
          done[key] = true;
          rpe[key] = i % 3 === 0 ? 'hard' : 'right';
        }
        if (i % 2 === 0 || i > -7) {
          const progress = (i + daysIn) / daysIn;
          const wobble = Math.sin(i * 1.7) * 0.35;
          weights.push({ date: key, kg: Math.round((78 - progress * 2.6 + wobble) * 10) / 10 });
        }
        if (i >= -7) {
          nutrition[key] = {
            kcal: 1650 + ((i * 97) % 260),
            pro: 115 + ((i * 13) % 25),
            water: 2400 + ((i * 300) % 600),
            steps: 7400 + ((i * 1311) % 3600),
          };
        }
      }
      nutrition[iso(now)] = { kcal: 1120, pro: 82, water: 1750, steps: 5200 };
      s.weights = weights;
      s.done = done;
      s.walks = walks;
      s.nutrition = nutrition;
      s.rpe = rpe;
      s.measure = [
        { date: iso(day(-daysIn)), waist: 88, chest: 98, hip: 104 },
        { date: iso(day(-14)), waist: 86.5, chest: 97.5, hip: 103 },
        { date: iso(day(-1)), waist: 85, chest: 97, hip: 102 },
      ];
      s.favorites = ['Band_Face_Pull', 'Dumbbell_Bicep_Curl', 'Band_Pull_Apart'];
      s.lastBackup = iso(day(-2));
      localStorage.setItem(key, JSON.stringify(stored));
    },
    [STORE_KEY, DAYS_IN, NOW.getTime()] as const,
  );
}

const coachPlan = {
  name: 'Home strength, 12 weeks',
  totalDays: 84,
  weekly: { mon: 'A', tue: 'walk', wed: 'B', thu: 'walk', fri: 'A', sat: 'walk', sun: 'rest' },
  sessions: [
    {
      id: 'A',
      name: 'Upper body',
      focus: 'Push and pull',
      exercises: [
        { catalogId: 'Push_Up', reps: '8–10 reps' },
        { catalogId: 'Band_Face_Pull', reps: '15 reps' },
        { catalogId: 'Dumbbell_Bicep_Curl', reps: '10 reps' },
      ],
    },
    {
      id: 'B',
      name: 'Lower body and core',
      focus: 'Knee-friendly legs',
      exercises: [
        { catalogId: 'Band_Pull_Apart', reps: '15 reps' },
        { catalogId: 'Band_Biceps_Curl', reps: '12 reps' },
      ],
    },
  ],
  phases: [
    { n: 1, name: 'Base', startDay: 1, endDay: 42, work: 40, rest: 20, rounds: 2 },
    { n: 2, name: 'Build', startDay: 43, endDay: 84, work: 45, rest: 15, rounds: 3 },
  ],
  notes: ['Warm up for 5 minutes first.', 'Keep squats shallow while the left knee settles.'],
};

const text = (t: string) => ({ content: [{ type: 'text', text: t }], stop_reason: 'end_turn' });

function mockAnthropic(page: Page, replies: unknown[]) {
  return page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(replies.shift()),
    });
  });
}

test('README screenshots', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await page.clock.setFixedTime(NOW);

  // First run, dark theme (the default).
  await onboard(page);
  await addHistory(page);

  const pages: [string, string][] = [
    ['/', 'dashboard'],
    ['/workout', 'workout'],
    ['/gallery', 'gallery'],
    ['/schedule', 'schedule'],
    ['/progress', 'progress'],
    ['/nutrition', 'nutrition'],
    ['/plan', 'plan'],
    ['/settings', 'settings'],
  ];
  for (const [path, name] of pages) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main')).toBeVisible();
    // Charts animate in; give them a moment even with reduced motion.
    await page.waitForTimeout(600);
    await shot(page, name);
  }

  await page.goto('/gallery/shoulders/Band_Face_Pull');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(600);
  await shot(page, 'gallery-exercise');

  // AI coach: not connected, the key dialog, then a scripted conversation.
  await page.goto('/coach');
  await expect(page.getByText('AI not connected')).toBeVisible();
  await shot(page, 'coach-not-connected');
  await page.getByRole('button', { name: 'Connect AI' }).click();
  const dialog = page.getByRole('dialog', { name: 'Connect your AI key' });
  await dialog.getByLabel('API key').fill('sk-ant-demo-not-a-real-key-1234');
  await shot(page, 'coach-key');

  await mockAnthropic(page, [
    text(
      'Hi Alex! I have your profile. Two quick questions: which days suit you best, and is your left knee sore on stairs or only when squatting deep?',
    ),
    {
      content: [
        { type: 'text', text: 'Thanks. Let me pick knee-friendly moves for a dumbbell and band.' },
        { type: 'tool_use', id: 's1', name: 'search_exercises', input: { knee: 'friendly' } },
      ],
      stop_reason: 'tool_use',
    },
    {
      content: [{ type: 'tool_use', id: 'p1', name: 'propose_plan', input: coachPlan }],
      stop_reason: 'tool_use',
    },
    text(
      'Here is a 3-day plan built around your dumbbells and band, with walks in between. Accept it if it looks right, or tell me what to change.',
    ),
  ]);
  // Taller window so the whole conversation fits without scrolling the page.
  await page.setViewportSize({ width: 1440, height: 1240 });
  await dialog.getByRole('button', { name: 'Save key' }).click();
  await expect(page.getByText('AI key saved')).toBeHidden({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Design my plan' }).click();
  await expect(page.getByText(/which days suit you best/)).toBeVisible();
  await page.getByLabel('Message the coach').fill('Mon, Wed, Fri. Only deep squats hurt.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('region', { name: 'Proposed plan' })).toBeVisible();
  await expect(page.getByText(/Accept it if it looks right/)).toBeVisible();
  await page.waitForTimeout(600);
  await shot(page, 'coach-chat');
  await page.evaluate(() => localStorage.removeItem('fitpower-ai-key'));
  await page.setViewportSize({ width: 1440, height: 900 });

  // Phone width, reusing this demo's saved data.
  const storage = await page.context().storageState();
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
    storageState: storage,
  });
  const mobile = await phone.newPage();
  await mobile.clock.setFixedTime(NOW);
  await mobile.goto('/');
  await mobile.waitForTimeout(800);
  await shot(mobile, 'mobile-dashboard');
  await mobile.goto('/workout');
  await mobile.waitForTimeout(800);
  await shot(mobile, 'mobile-workout');
  await phone.close();

  // Light theme versions of the two main screens.
  await setTheme(page, 'light');
  await page.goto('/');
  await page.waitForTimeout(600);
  await shot(page, 'dashboard-light');
  await page.goto('/workout');
  await page.waitForTimeout(600);
  await shot(page, 'workout-light');
});
