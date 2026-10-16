/** User profile — hard-coded per AGENT_PROMPT.md (single-user, local-only app). */
export const HEIGHT_CM = 166;
export const START_WEIGHT_KG = 80;
export const GOAL_WEIGHT_KG = 70;
export const AGE_YEARS = 32;
export const PROGRAM_DAYS = 180;

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
