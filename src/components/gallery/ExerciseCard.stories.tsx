import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExerciseCard } from './ExerciseCard';
import { storyExercise } from './storyFixtures';

const meta = {
  title: 'Gallery/ExerciseCard',
  component: ExerciseCard,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="flex w-72 bg-bg p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    exercise: storyExercise,
    favorite: false,
    onToggleFavorite: () => {},
    to: '/gallery/arms/Dumbbell_Bicep_Curl',
  },
} satisfies Meta<typeof ExerciseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Favorited: Story = { args: { favorite: true } };

export const KneeCaution: Story = {
  args: { exercise: { ...storyExercise, knee: 'caution', difficulty: 'intermediate' } },
};

export const KneeAvoid: Story = {
  args: { exercise: { ...storyExercise, knee: 'avoid', difficulty: 'advanced', score: 9 } },
};

export const NeedsBench: Story = {
  args: { exercise: { ...storyExercise, needsBench: true } },
};

export const AllBadges: Story = {
  args: {
    favorite: true,
    exercise: {
      ...storyExercise,
      name: 'Bulgarian split squat (dumbbell)',
      difficulty: 'intermediate',
      knee: 'avoid',
      needsBench: true,
      score: 9,
    },
  },
};

export const BandLowScore: Story = {
  args: { exercise: { ...storyExercise, name: 'Band grip squeeze', equipment: 'band', score: 5 } },
};

export const NoImages: Story = {
  args: { exercise: { ...storyExercise, equipment: 'bodyweight', images: [] } },
};

/** No detail route: the card is not a link (only the star is interactive). */
export const NotLinked: Story = { args: { to: undefined } };
