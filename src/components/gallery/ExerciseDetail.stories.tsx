import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExerciseDetail } from './ExerciseDetail';
import { emptyHistory, storyExercise, storyHistory, storySources } from './storyFixtures';

const meta = {
  title: 'Gallery/ExerciseDetail',
  component: ExerciseDetail,
  parameters: { layout: 'fullscreen' },
  args: {
    exercise: storyExercise,
    sources: storySources,
    history: storyHistory,
    favorite: false,
    onToggleFavorite: () => {},
    onClose: () => {},
  },
} satisfies Meta<typeof ExerciseDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImagesAndHistory: Story = {};

export const NoHistory: Story = { args: { history: emptyHistory } };

export const NoImages: Story = {
  args: { exercise: { ...storyExercise, images: [] }, history: emptyHistory },
};

export const SearchFallbackVideo: Story = {
  args: { exercise: { ...storyExercise, videoUrl: null } },
};

export const KneeAvoidWithImageNote: Story = {
  args: {
    favorite: true,
    exercise: {
      ...storyExercise,
      knee: 'avoid',
      needsBench: true,
      imageNote: 'Demo image shows the cable-machine version; perform it with a resistance band.',
    },
  },
};
