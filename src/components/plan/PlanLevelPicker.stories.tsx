import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { legacyProfile } from '@/domain/plans/legacy';
import { PlanLevelPicker } from './PlanLevelPicker';

const START = '2026-08-24';
const profile = legacyProfile(START, START, 'story');

const meta = {
  title: 'Plan/PlanLevelPicker',
  component: PlanLevelPicker,
  args: { profile, startDate: START, onChoose: fn() },
} satisfies Meta<typeof PlanLevelPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstChoice: Story = {};
export const WithCurrentPlan: Story = {
  args: { activeLevel: 'intermediate', confirmReplace: true },
};
export const Advanced: Story = {
  args: { profile: { ...profile, experience: 'advanced', injuries: [], daysPerWeek: 5 } },
};
export const Saving: Story = { args: { saving: true } };
