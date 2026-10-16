import { selectAppData, useAppStore } from '@/store/useAppStore';
import { normalizeBackup } from '@/domain/schema';
import { userProfileSchema } from '@/domain/profile';
import { trainingPlanSchema } from '@/domain/plan';
import type { LogRepository } from './Repository';

export const localRepository: LogRepository = {
  async getAppData() {
    return selectAppData(useAppStore.getState());
  },

  async setStartDate(date) {
    useAppStore.getState().setStartDate(date);
  },

  async getProfile() {
    return useAppStore.getState().profile ?? null;
  },

  async saveProfile(profile) {
    const valid = userProfileSchema.parse(profile);
    useAppStore.getState().saveProfile(valid);
    return valid;
  },

  async getPlan() {
    return useAppStore.getState().plan ?? null;
  },

  async savePlan(plan) {
    const valid = trainingPlanSchema.parse(plan);
    useAppStore.getState().savePlan(valid);
    return valid;
  },

  async saveWeight(entry) {
    useAppStore.getState().saveWeight(entry);
  },

  async deleteWeight(date) {
    useAppStore.getState().deleteWeight(date);
  },

  async saveMeasurement(entry) {
    useAppStore.getState().saveMeasurement(entry);
  },

  async deleteMeasurement(date) {
    useAppStore.getState().deleteMeasurement(date);
  },

  async toggleDone(date) {
    useAppStore.getState().toggleDone(date);
  },

  async markDone(date) {
    useAppStore.getState().markDone(date);
  },

  async toggleWalk(date) {
    useAppStore.getState().toggleWalk(date);
  },

  async saveSet(date, exerciseName, set) {
    useAppStore.getState().saveSet(date, exerciseName, set);
  },

  async setRpe(date, rpe) {
    useAppStore.getState().setRpe(date, rpe);
  },

  async toggleFavorite(exerciseId) {
    useAppStore.getState().toggleFavorite(exerciseId);
  },

  async addNutrition(date, field, amount) {
    useAppStore.getState().addNutrition(date, field, amount);
  },

  async setSteps(date, steps) {
    useAppStore.getState().setSteps(date, steps);
  },

  async resetNutritionDay(date) {
    useAppStore.getState().resetNutritionDay(date);
  },

  async recordBackup(date) {
    useAppStore.getState().setLastBackup(date);
  },

  async snoozeBackup(untilDate) {
    useAppStore.getState().setBackupSnooze(untilDate);
  },

  async exportBackup() {
    return selectAppData(useAppStore.getState());
  },

  async importBackup(raw) {
    const data = normalizeBackup(raw);
    useAppStore.getState().importAppData(data);
    return data;
  },

  async reset() {
    useAppStore.getState().reset();
    return selectAppData(useAppStore.getState());
  },
};
