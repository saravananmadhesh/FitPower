import { useMutation, useQueryClient } from '@tanstack/react-query';
import { localRepository } from '@/data/localRepository';
import { clearCoachData } from '@/ai/clearCoachData';
import { useOnboardingDraft } from '@/components/onboarding/useOnboardingDraft';
import type { Measurement, Rpe, SetLog, WeightEntry } from '@/types';
import { queryKeys } from './keys';

/**
 * Representative mutation hooks proving the queries -> Repository pattern.
 * More land alongside each page milestone (Workout, Progress, Nutrition,
 * Schedule, Settings) as they start calling them — see CLAUDE.md build order.
 */

function useInvalidateAppData() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.appData });
}

export function useSaveWeightMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (entry: WeightEntry) => localRepository.saveWeight(entry),
    onSuccess: invalidate,
  });
}

export function useToggleDoneMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (date: string) => localRepository.toggleDone(date),
    onSuccess: invalidate,
  });
}

export function useImportBackupMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (raw: unknown) => localRepository.importBackup(raw),
    onSuccess: invalidate,
  });
}

export function useResetAppDataMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: async () => {
      const data = await localRepository.reset();
      // The AI key, chat and a half-finished setup live outside AppData;
      // "reset everything" clears them too.
      clearCoachData();
      useOnboardingDraft.getState().clear();
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useToggleWalkMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (date: string) => localRepository.toggleWalk(date),
    onSuccess: invalidate,
  });
}

export function useRecordBackupMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (date: string) => localRepository.recordBackup(date),
    onSuccess: invalidate,
  });
}

export function useSnoozeBackupMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (untilDate: string) => localRepository.snoozeBackup(untilDate),
    onSuccess: invalidate,
  });
}

export function useSaveSetMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: ({
      date,
      exerciseName,
      set,
    }: {
      date: string;
      exerciseName: string;
      set: SetLog;
    }) => localRepository.saveSet(date, exerciseName, set),
    onSuccess: invalidate,
  });
}

export function useSetRpeMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: ({ date, rpe }: { date: string; rpe: Rpe }) => localRepository.setRpe(date, rpe),
    onSuccess: invalidate,
  });
}

export function useMarkDoneMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (date: string) => localRepository.markDone(date),
    onSuccess: invalidate,
  });
}

export function useSetStartDateMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (date: string) => localRepository.setStartDate(date),
    onSuccess: invalidate,
  });
}

export function useDeleteWeightMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (date: string) => localRepository.deleteWeight(date),
    onSuccess: invalidate,
  });
}

export function useSaveMeasurementMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (entry: Measurement) => localRepository.saveMeasurement(entry),
    onSuccess: invalidate,
  });
}

export function useDeleteMeasurementMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (date: string) => localRepository.deleteMeasurement(date),
    onSuccess: invalidate,
  });
}

export function useAddNutritionMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: ({
      date,
      field,
      amount,
    }: {
      date: string;
      field: 'kcal' | 'pro' | 'water';
      amount: number;
    }) => localRepository.addNutrition(date, field, amount),
    onSuccess: invalidate,
  });
}

export function useSetStepsMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: ({ date, steps }: { date: string; steps: number }) =>
      localRepository.setSteps(date, steps),
    onSuccess: invalidate,
  });
}

export function useResetNutritionDayMutation() {
  const invalidate = useInvalidateAppData();
  return useMutation({
    mutationFn: (date: string) => localRepository.resetNutritionDay(date),
    onSuccess: invalidate,
  });
}
