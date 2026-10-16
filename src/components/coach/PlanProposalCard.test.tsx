import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import '@/i18n';
import { legacyPlan } from '@/domain/plans/legacy';
import { PlanProposalCard } from './PlanProposalCard';

const noop = (): void => undefined;

describe('PlanProposalCard', () => {
  it('shows schedule fit warnings from the shared plan rules', async () => {
    const { container } = render(
      <PlanProposalCard
        plan={legacyPlan('2026-10-17')}
        fit={[
          { code: 'too-many-days', days: 5, max: 3 },
          { code: 'session-too-long', session: 'Full body A', minutes: 48, max: 30 },
        ]}
        status="pending"
        onAccept={noop}
        onAskChanges={noop}
      />,
    );
    expect(screen.getByRole('heading', { name: "Doesn't fit your schedule yet" })).toBeTruthy();
    expect(screen.getByText('Trains 5 days a week; your profile says 3.')).toBeTruthy();
    expect(
      screen.getByText('Full body A runs about 48 min; your profile says 30 min.'),
    ).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows no fit block when the plan fits', () => {
    render(
      <PlanProposalCard
        plan={legacyPlan('2026-10-17')}
        status="pending"
        onAccept={noop}
        onAskChanges={noop}
      />,
    );
    expect(screen.queryByRole('heading', { name: "Doesn't fit your schedule yet" })).toBeNull();
  });
});
