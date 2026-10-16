import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Button } from './Button';

describe('Button', () => {
  it('renders children and responds to click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Log weight</Button>);
    const btn = screen.getByRole('button', { name: 'Log weight' });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disables interaction while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Saving' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('hides label for icon-only + loading but keeps an accessible name', () => {
    render(
      <Button loading iconOnly aria-label="Add photo">
        <span data-testid="icon">icon</span>
      </Button>,
    );
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeInTheDocument();
  });

  it.each([
    ['primary', 'text-accent-ink'],
    ['secondary', 'text-text'],
    ['ghost', 'text-text-muted'],
    ['danger', 'text-white'],
  ] as const)(
    'keeps its %s text-color class after merging with the size class (regression: tailwind-merge silently dropped custom color utilities it did not recognize, e.g. text-accent-ink vs text-body, leaving buttons with near-invisible contrast)',
    (variant, expectedClass) => {
      render(<Button variant={variant}>Label</Button>);
      const classList = screen.getByRole('button', { name: 'Label' }).className;
      expect(classList.split(' ')).toContain(expectedClass);
    },
  );

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Button>Primary</Button>
        <Button variant="danger">Danger</Button>
        <Button iconOnly aria-label="Favorite">
          <span>♥</span>
        </Button>
      </>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
