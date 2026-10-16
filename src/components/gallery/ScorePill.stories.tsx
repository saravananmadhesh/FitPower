import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScorePill } from './ScorePill';

const meta = {
  title: 'Gallery/ScorePill',
  component: ScorePill,
  parameters: { layout: 'centered' },
  args: { score: 8 },
} satisfies Meta<typeof ScorePill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TopTier: Story = { args: { score: 9 } };
export const Strong: Story = { args: { score: 8 } };
export const Muted: Story = { args: { score: 6 } };

export const AllTiers: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 bg-bg p-4">
      {[9, 8.5, 8, 7.5, 7, 6, 5, 3.5].map((score) => (
        <ScorePill key={score} score={score} />
      ))}
    </div>
  ),
};
