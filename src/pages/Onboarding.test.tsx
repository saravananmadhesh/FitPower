import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import '@/i18n';
import { localRepository } from '@/data/localRepository';
import { useOnboardingDraft } from '@/components/onboarding/useOnboardingDraft';
import { ROUTES } from '@/routes';
import Onboarding from './Onboarding';

function renderOnboarding() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ROUTES.onboarding]}>
        <Routes>
          <Route path={ROUTES.onboarding} element={<Onboarding />} />
          <Route path={ROUTES.dashboard} element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });
const next = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Continue' }));

beforeEach(async () => {
  await localRepository.reset();
  useOnboardingDraft.getState().clear();
});

describe('Onboarding wizard', () => {
  it('shows inline errors and stays on the step when required answers are missing', async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await heading('About you');
    await next(user);
    expect(await screen.findByText('Enter a date')).toBeInTheDocument();
    expect(screen.getByText('Choose an option')).toBeInTheDocument();
    expect(screen.getByLabelText('Date of birth')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('heading', { level: 1, name: 'About you' })).toBeInTheDocument();
  });

  it('walks every step, saves a profile and a plan to the target date', async () => {
    const user = userEvent.setup();
    const { container } = renderOnboarding();

    await heading('About you');
    expect(await axe(container)).toHaveNoViolations();
    await user.type(screen.getByLabelText(/Your name/), 'Alex');
    await user.type(screen.getByLabelText('Date of birth'), '1990-01-01');
    await user.click(screen.getByLabelText('Male'));
    await next(user);

    await heading('Your body');
    await user.type(screen.getByLabelText('Height (cm)'), '180');
    await user.type(screen.getByLabelText('Current weight (kg)'), '90');
    await user.type(screen.getByLabelText('Goal weight (kg)'), '80');
    await next(user);

    await heading('Your goal');
    await user.click(screen.getByLabelText(/Build muscle/));
    await user.click(screen.getByRole('button', { name: '1 year' }));
    await next(user);

    await heading('Training experience');
    await user.click(screen.getByLabelText(/Advanced/));
    await next(user);

    await heading('Injuries and health');
    expect(await axe(container)).toHaveNoViolations();
    await next(user);

    await heading('Lifestyle');
    const [diet, health, days, minutes] = screen.getAllByRole('group');
    for (const [group, label] of [
      [diet, '4'],
      [health, '5'],
      [days, '5 days'],
      [minutes, '60 min'],
    ] as const) {
      await user.click(
        Array.from(group.querySelectorAll('label')).find((l) => l.textContent === label)!,
      );
    }
    await next(user);

    await heading('Choose your plan');
    expect(await axe(container)).toHaveNoViolations();
    // Advanced, healthy, no injuries → Hard is recommended and pre-selected.
    expect(screen.getByLabelText(/Hard/)).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Create my plan' }));

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    const data = await localRepository.getAppData();
    expect(data.profile).toMatchObject({
      name: 'Alex',
      sex: 'male',
      heightCm: 180,
      goalType: 'muscle',
      experience: 'advanced',
      injuries: [],
      dietRating: 4,
      healthRating: 5,
      daysPerWeek: 5,
      minutesPerSession: 60,
    });
    expect(data.plan?.source).toBe('builtin-hard');
    expect(data.plan?.totalDays).toBe(365);
    expect(data.startDate).toBe(data.plan?.startDate);
    expect(useOnboardingDraft.getState().draft).toBeNull();
  });

  it('Back keeps the answers already given', async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await heading('About you');
    await user.type(screen.getByLabelText('Date of birth'), '1990-01-01');
    await user.click(screen.getByLabelText('Female'));
    await next(user);
    await heading('Your body');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await heading('About you');
    expect(screen.getByLabelText('Date of birth')).toHaveValue('1990-01-01');
    expect(screen.getByLabelText('Female')).toBeChecked();
  });
});
