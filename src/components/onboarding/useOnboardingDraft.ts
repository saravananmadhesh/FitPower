import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OnboardingDraft, OnboardingStep } from '@/domain/onboarding';

/**
 * The half-finished wizard, kept in its own localStorage entry so closing the
 * tab mid-way resumes where the user left off. It is UI state, not app data:
 * it never reaches AppData or backups and is cleared once onboarding saves.
 */
interface OnboardingDraftState {
  /** null until the wizard first opens (so it can seed from defaults or a profile). */
  draft: OnboardingDraft | null;
  step: OnboardingStep;
  start: (draft: OnboardingDraft) => void;
  update: (patch: OnboardingDraft, step: OnboardingStep) => void;
  clear: () => void;
}

export const ONBOARDING_DRAFT_KEY = 'fitpower-onboarding-draft';

export const useOnboardingDraft = create<OnboardingDraftState>()(
  persist(
    (set) => ({
      draft: null,
      step: 'about',
      start: (draft) => set({ draft, step: 'about' }),
      update: (patch, step) => set((s) => ({ draft: { ...s.draft, ...patch }, step })),
      clear: () => set({ draft: null, step: 'about' }),
    }),
    {
      name: ONBOARDING_DRAFT_KEY,
      version: 1,
      partialize: (s) => ({ draft: s.draft, step: s.step }),
    },
  ),
);
