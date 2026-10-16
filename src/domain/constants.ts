/**
 * Workout Gallery album ids, in display order. Kept here (not in catalog.ts)
 * so the app shell can list albums without pulling the catalog JSON into the
 * main bundle.
 */
export const ALBUM_IDS = [
  'arms',
  'shoulders',
  'chest',
  'back',
  'core',
  'legs',
  'full-body',
] as const;

/**
 * Equipment and difficulty vocabularies shared by the exercise catalog, the
 * user profile and training plans. Kept here for the same bundle reason.
 */
export const EQUIPMENT = ['dumbbell', 'band', 'bodyweight'] as const;
export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
