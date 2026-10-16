import type { AppData, Measurement, Photo, Rpe, SetLog, WeightEntry } from '@/types';

/**
 * The data-access seam. UI never talks to storage directly — it goes
 * through queries/ -> Repository -> (local now, API later). Same
 * interface for `localRepository` (today) and `apiRepository` (stub).
 */
export interface LogRepository {
  getAppData(): Promise<AppData>;
  setStartDate(date: string): Promise<void>;
  saveWeight(entry: WeightEntry): Promise<void>;
  deleteWeight(date: string): Promise<void>;
  saveMeasurement(entry: Measurement): Promise<void>;
  deleteMeasurement(date: string): Promise<void>;
  toggleDone(date: string): Promise<void>;
  markDone(date: string): Promise<void>;
  toggleWalk(date: string): Promise<void>;
  saveSet(date: string, exerciseName: string, set: SetLog): Promise<void>;
  setRpe(date: string, rpe: Rpe): Promise<void>;
  /** Adds or removes an exercise-catalog id from the user's favorites. */
  toggleFavorite(exerciseId: string): Promise<void>;
  addNutrition(date: string, field: 'kcal' | 'pro' | 'water', amount: number): Promise<void>;
  setSteps(date: string, steps: number): Promise<void>;
  resetNutritionDay(date: string): Promise<void>;
  recordBackup(date: string): Promise<void>;
  snoozeBackup(untilDate: string): Promise<void>;
  exportBackup(): Promise<AppData>;
  importBackup(raw: unknown): Promise<AppData>;
  reset(): Promise<AppData>;
}

export interface PhotoRepository {
  list(): Promise<Photo[]>;
  add(date: string, file: Blob): Promise<Photo>;
  /** Imports a file with its own name and the file's mtime as its date — used for
   * importing pre-existing images from a connected folder (see data/photoFolder.ts). */
  addFromFile(name: string, file: File): Promise<Photo>;
  remove(id: number): Promise<void>;
}
