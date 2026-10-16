import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/i18n';
import { localRepository } from '@/data/localRepository';
import { legacyPlan, legacyProfile } from '@/domain/plans/legacy';
import { todayISO } from '@/domain/dates';
import Plan from './Plan';

function renderPlan() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Plan />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await localRepository.reset();
  await localRepository.saveProfile(legacyProfile(todayISO(), todayISO()));
  await localRepository.savePlan(legacyPlan(todayISO()));
});

describe('Plan page', () => {
  it('shows the AI-not-connected notice and recommends a built-in level', async () => {
    const { container } = renderPlan();
    expect(await screen.findByRole('heading', { name: 'AI coach not connected' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connect AI' })).toHaveProperty('disabled', true);
    expect(screen.getByText('Original program')).toBeTruthy();

    const easy = screen.getByRole('heading', { name: 'Easy' }).closest('li') as HTMLElement;
    // The original profile is a beginner, so Easy is recommended.
    expect(within(easy).getByText('Recommended')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('switches to a built-in plan after confirming', async () => {
    renderPlan();
    await userEvent.click(await screen.findByRole('button', { name: 'Use this plan: Hard' }));
    const dialog = await screen.findByRole('dialog', { name: 'Switch to the Hard plan?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Switch plan' }));

    expect(await screen.findByText('Built-in · Hard')).toBeTruthy();
    const hard = screen.getByRole('heading', { name: 'Hard' }).closest('li') as HTMLElement;
    expect(within(hard).getByRole('button', { name: 'Current plan' })).toHaveProperty(
      'disabled',
      true,
    );
    const saved = await localRepository.getAppData();
    expect(saved.plan?.source).toBe('builtin-hard');
    expect(saved.plan?.startDate).toBe(todayISO());
  });

  it('links each session move to the gallery and YouTube', async () => {
    renderPlan();
    const link = await screen.findByRole('link', {
      name: 'Open DB goblet squat (box, partial) in the gallery',
    });
    expect(link.getAttribute('href')).toBe('/gallery/legs/DB_Goblet_Squat');
    expect(
      screen
        .getByRole('link', { name: 'Watch DB goblet squat (box, partial) on YouTube' })
        .getAttribute('href'),
    ).toMatch(/youtube\.com/);
  });

  it('shows knee rules only when the profile has a knee injury', async () => {
    renderPlan();
    expect(await screen.findByRole('heading', { name: 'Knee rules' })).toBeTruthy();
  });

  it('hides knee rules without a knee injury', async () => {
    await localRepository.saveProfile({
      ...legacyProfile(todayISO(), todayISO()),
      injuries: [],
    });
    renderPlan();
    await screen.findByRole('heading', { name: 'Safety notes' });
    expect(screen.queryByRole('heading', { name: 'Knee rules' })).toBeNull();
  });
});
