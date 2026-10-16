export const ROUTES = {
  dashboard: '/',
  workout: '/workout',
  gallery: '/gallery',
  // The optional segment deep-links the exercise detail dialog over its album.
  galleryAlbum: '/gallery/:albumId/:exerciseId?',
  schedule: '/schedule',
  progress: '/progress',
  nutrition: '/nutrition',
  photos: '/photos',
  plan: '/plan',
  settings: '/settings',
} as const;

/** Pseudo-album id for the user's favorited exercises (`/gallery/favorites`). */
export const FAVORITES_ALBUM_ID = 'favorites';

export function galleryAlbumPath(albumId: string): string {
  return `${ROUTES.gallery}/${albumId}`;
}

export function galleryExercisePath(albumId: string, exerciseId: string): string {
  return `${galleryAlbumPath(albumId)}/${encodeURIComponent(exerciseId)}`;
}
