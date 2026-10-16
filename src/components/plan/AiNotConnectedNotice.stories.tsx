import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AiNotConnectedNotice } from './AiNotConnectedNotice';

const meta = {
  title: 'Plan/AiNotConnectedNotice',
  component: AiNotConnectedNotice,
} satisfies Meta<typeof AiNotConnectedNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before the AI coach ships: the button is shown but unavailable. */
export const CoachUnavailable: Story = {};
export const CanConnect: Story = { args: { onConnect: fn() } };
