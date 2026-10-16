export interface WeightEntry {
  date: string; // YYYY-MM-DD
  kg: number;
}

export interface Measurement {
  date: string;
  waist: number | null;
  chest: number | null;
  hip: number | null;
}

export interface DayNutrition {
  kcal: number;
  pro: number;
  water: number;
  steps: number;
}

export interface SetLog {
  w: number;
  reps: number;
}

export type Rpe = 'easy' | 'right' | 'hard';

export interface AppData {
  startDate: string;
  startSet: boolean;
  weights: WeightEntry[];
  measure: Measurement[];
  done: Record<string, boolean>;
  walks: Record<string, boolean>;
  nutrition: Record<string, DayNutrition>;
  sets: Record<string, Record<string, SetLog>>;
  rpe: Record<string, Rpe>;
  /** Favorited exercise ids (keys into the exercise catalog). */
  favorites: string[];
  lastBackup?: string;
  backupSnoozeUntil?: string;
}

/** Progress photos live in IndexedDB, not in AppData. */
export interface Photo {
  id: number;
  date: string;
  name: string;
  data: string; // downscaled JPEG data URL
  ts: number;
}
