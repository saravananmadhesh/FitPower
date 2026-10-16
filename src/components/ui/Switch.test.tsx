import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Switch } from './Switch';

describe('Switch', () => {
  it('reports its checked state and calls back on toggle', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} label="Sound cues" />);
    const toggle = screen.getByRole('switch', { name: 'Sound cues' });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('is keyboard operable (Space toggles a focused switch)', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} label="Compact density" />);
    await userEvent.tab();
    expect(screen.getByRole('switch')).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('has no accessibility violations in either state', async () => {
    const { container, rerender } = render(
      <Switch checked={false} onCheckedChange={() => {}} label="Light theme" />,
    );
    expect(await axe(container)).toHaveNoViolations();
    rerender(<Switch checked={true} onCheckedChange={() => {}} label="Light theme" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
