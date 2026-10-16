import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import '@/i18n';
import { localRepository } from '@/data/localRepository';
import { legacyProfile } from '@/domain/plans/legacy';
import { todayISO } from '@/domain/dates';
import { ProfileCard } from './ProfileCard';

const profile = legacyProfile(todayISO(), todayISO());

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfileCard profile={profile} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await localRepository.reset();
  await localRepository.saveProfile(profile);
});

describe('ProfileCard', () => {
  it('saves edited fields and keeps the rest of the profile', async () => {
    renderCard();
    const name = screen.getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Alex');
    const goal = screen.getByLabelText('Goal weight (kg)');
    await userEvent.clear(goal);
    await userEvent.type(goal, '65');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await expect.poll(async () => (await localRepository.getProfile())?.name).toBe('Alex');
    const saved = await localRepository.getProfile();
    expect(saved?.goalWeightKg).toBe(65);
    expect(saved?.heightCm).toBe(profile.heightCm);
    expect(saved?.injuries).toEqual(profile.injuries);
  });

  it('shows an accessible error for an out-of-range height', async () => {
    renderCard();
    const height = screen.getByLabelText('Height (cm)');
    await userEvent.clear(height);
    await userEvent.type(height, '20');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Enter a height between 100 and 250 cm')).toBeInTheDocument();
    expect(height).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a date of birth in the future', async () => {
    renderCard();
    const birth = screen.getByLabelText('Date of birth');
    await userEvent.clear(birth);
    await userEvent.type(birth, '2099-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Enter a valid date of birth')).toBeInTheDocument();
    expect(birth).toHaveAttribute('aria-invalid', 'true');
  });

  it('hides Redo setup until the onboarding wizard exists', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: 'Redo setup' })).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderCard();
    expect(await axe(container)).toHaveNoViolations();
  });
});
