import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dumbbell, Star } from 'lucide-react';
import { AlbumCard } from './AlbumCard';

const meta = {
  title: 'Gallery/AlbumCard',
  component: AlbumCard,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-72 bg-bg p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    to: '/gallery/arms',
    name: 'Arms',
    meta: '60 exercises · 3 sub-albums',
    cover: 'exercises/One_Arm_Dumbbell_Preacher_Curl/0.webp',
    icon: Dumbbell,
  },
} satisfies Meta<typeof AlbumCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCover: Story = {};

export const FavoritesEmpty: Story = {
  args: {
    to: '/gallery/favorites',
    name: 'Favorites',
    meta: 'Tap ☆ on any exercise to save it here',
    cover: undefined,
    icon: Star,
  },
};

export const FavoritesWithCount: Story = {
  args: { ...FavoritesEmpty.args, meta: '4 exercises' },
};
