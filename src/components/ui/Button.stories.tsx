import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heart, Plus } from 'lucide-react';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md'] },
  },
  args: {
    children: 'Log weight',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Reset everything' } };

export const Small: Story = { args: { size: 'sm' } };

export const WithLeftIcon: Story = {
  args: { leftIcon: <Plus className="h-4 w-4" aria-hidden="true" /> },
};

export const IconOnly: Story = {
  args: {
    iconOnly: true,
    'aria-label': 'Add to favorites',
    children: <Heart className="h-4 w-4" aria-hidden="true" />,
  },
};

export const Loading: Story = { args: { loading: true, children: 'Saving…' } };

export const Disabled: Story = { args: { disabled: true } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 bg-bg p-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="primary" loading>
        Loading
      </Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
    </div>
  ),
};
