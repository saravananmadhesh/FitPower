// Callbacks passed to page.evaluate() run in the browser, so this file needs the DOM lib.
/// <reference lib="dom" />
import { test, expect, type Page, type Route } from '@playwright/test';
import { seedProfile } from './fixtures/seedProfile';

/** Must match AI_KEY_STORAGE_KEY in src/data/aiKeyStore.ts. */
const AI_KEY_STORAGE_KEY = 'fitpower-ai-key';
const FAKE_KEY = 'sk-ant-e2e-not-a-real-key';

const draft = {
  name: 'Home strength, 12 weeks',
  totalDays: 84,
  weekly: { mon: 'A', tue: 'walk', wed: 'B', thu: 'walk', fri: 'A', sat: 'walk', sun: 'rest' },
  sessions: [
    {
      id: 'A',
      name: 'Upper body',
      focus: 'Push + pull',
      exercises: [
        { catalogId: 'Push_Up', reps: '8–10 reps' },
        { catalogId: 'Band_Biceps_Curl', reps: '12 reps' },
      ],
    },
    {
      id: 'B',
      name: 'Arms',
      focus: 'Arms',
      exercises: [{ catalogId: 'Dumbbell_Bicep_Curl', reps: '10 reps' }],
    },
  ],
  phases: [
    { n: 1, name: 'Base', startDay: 1, endDay: 42, work: 40, rest: 20, rounds: 2 },
    { n: 2, name: 'Build', startDay: 43, endDay: 84, work: 45, rest: 15, rounds: 3 },
  ],
  notes: ['Warm up 5 minutes first.'],
};

/** Scripted Anthropic responses, in order. No real AI is ever called. */
function mockAnthropic(page: Page, replies: unknown[]): { requests: unknown[] } {
  const requests: unknown[] = [];
  void page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
    requests.push(route.request().postDataJSON());
    const reply = replies.shift();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(reply),
    });
  });
  return { requests };
}

const text = (t: string) => ({ content: [{ type: 'text', text: t }], stop_reason: 'end_turn' });

test.beforeEach(async ({ page }) => {
  await seedProfile(page);
});

test('without a key the coach says AI is not connected and calls nothing', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost')) external.push(req.url());
  });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByText('AI coach').click();
  await expect(page).toHaveURL(/\/coach$/);
  await expect(page.getByText('AI not connected')).toBeVisible();
  expect(external).toEqual([]);
});

test('connect a key, get interviewed, accept the AI plan, then remove the key', async ({
  page,
}) => {
  const api = mockAnthropic(page, [
    text('Happy to help! Which days suit you best, and do you have a bench?'),
    {
      content: [
        { type: 'text', text: 'Let me find knee-friendly moves.' },
        { type: 'tool_use', id: 's1', name: 'search_exercises', input: { knee: 'friendly' } },
      ],
      stop_reason: 'tool_use',
    },
    {
      content: [{ type: 'tool_use', id: 'p1', name: 'propose_plan', input: draft }],
      stop_reason: 'tool_use',
    },
    text('Here is a 3-day plan built around your home kit. Accept it if it looks right.'),
  ]);

  await page.goto('/coach');
  await page.getByRole('button', { name: 'Connect AI' }).click();
  const dialog = page.getByRole('dialog', { name: 'Connect your AI key' });
  await dialog.getByLabel('API key').fill(FAKE_KEY);
  await dialog.getByRole('button', { name: 'Save key' }).click();
  await expect(page.getByText(/Connected to Anthropic/)).toBeVisible();

  await page.getByRole('button', { name: 'Design my plan' }).click();
  await expect(page.getByText(/Which days suit you best/)).toBeVisible();

  await page.getByLabel('Message the coach').fill('Mon, Wed, Fri. No bench.');
  await page.getByRole('button', { name: 'Send' }).click();
  const card = page.getByRole('region', { name: 'Proposed plan' });
  await expect(card.getByText('Home strength, 12 weeks')).toBeVisible();
  await expect(page.getByText(/3-day plan built around your home kit/)).toBeVisible();

  // The key went to the provider in the header, and tool results went back to it.
  const last = api.requests.at(-1) as { messages: { content: { type: string }[] }[] };
  expect(last.messages.at(-1)?.content[0].type).toBe('tool_result');

  await card.getByRole('button', { name: 'Accept plan' }).click();
  await expect(card.getByText('Accepted, now your active plan')).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fitpower-data') ?? '{}'),
  );
  expect(stored.state.plan).toMatchObject({ source: 'ai', name: 'Home strength, 12 weeks' });
  expect(JSON.stringify(stored)).not.toContain(FAKE_KEY);

  // Survives a reload; then the key can be removed and the coach goes back to "not connected".
  await page.reload();
  await expect(page.getByRole('region', { name: 'Proposed plan' })).toBeVisible();
  await page.getByRole('button', { name: 'AI key' }).click();
  await page
    .getByRole('dialog', { name: 'Connect your AI key' })
    .getByRole('button', { name: 'Remove key' })
    .click();
  await expect(page.getByText('AI not connected')).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), AI_KEY_STORAGE_KEY)).toBeNull();
});
