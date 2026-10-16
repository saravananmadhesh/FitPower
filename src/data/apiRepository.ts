import type { LogRepository } from './Repository';

/**
 * Future-backend seam. Implements the exact same interface as
 * `localRepository`; wire this up against an ASP.NET Core + EF Core +
 * SQL Server API (see CLAUDE.md "Future: backend & cloud sync") without
 * touching any UI/query code. Not wired into the app yet.
 */
function notImplemented(method: string): never {
  throw new Error(`apiRepository.${method} is not implemented yet — local-only for now.`);
}

export const apiRepository: LogRepository = {
  getAppData: () => notImplemented('getAppData'),
  setStartDate: () => notImplemented('setStartDate'),
  getProfile: () => notImplemented('getProfile'),
  saveProfile: () => notImplemented('saveProfile'),
  getPlan: () => notImplemented('getPlan'),
  savePlan: () => notImplemented('savePlan'),
  saveWeight: () => notImplemented('saveWeight'),
  deleteWeight: () => notImplemented('deleteWeight'),
  saveMeasurement: () => notImplemented('saveMeasurement'),
  deleteMeasurement: () => notImplemented('deleteMeasurement'),
  toggleDone: () => notImplemented('toggleDone'),
  markDone: () => notImplemented('markDone'),
  toggleWalk: () => notImplemented('toggleWalk'),
  saveSet: () => notImplemented('saveSet'),
  setRpe: () => notImplemented('setRpe'),
  toggleFavorite: () => notImplemented('toggleFavorite'),
  addNutrition: () => notImplemented('addNutrition'),
  setSteps: () => notImplemented('setSteps'),
  resetNutritionDay: () => notImplemented('resetNutritionDay'),
  recordBackup: () => notImplemented('recordBackup'),
  snoozeBackup: () => notImplemented('snoozeBackup'),
  exportBackup: () => notImplemented('exportBackup'),
  importBackup: () => notImplemented('importBackup'),
  reset: () => notImplemented('reset'),
};
