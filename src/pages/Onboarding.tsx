import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { OnboardingWizard, type CompletionMode } from '@/components/onboarding/OnboardingWizard';
import { useOnboardingDraft } from '@/components/onboarding/useOnboardingDraft';
import { useSaveProfileMutation } from '@/queries/useProfile';
import { useAppDataQuery } from '@/queries/useAppDataQuery';
import { useSavePlanMutation } from '@/queries/usePlan';
import {
  draftFromProfile,
  initialDraft,
  profileFromAnswers,
  type OnboardingAnswers,
} from '@/domain/onboarding';
import { todayISO } from '@/domain/dates';
import { currentWeight } from '@/domain/nutrition';
import { generatePlan } from '@/domain/planGenerator';
import { FEATURES } from '@/config/features';
import { logger } from '@/utils/logger';
import { ROUTES } from '@/routes';

/**
 * First-run setup (release-plan W1): asks about the user, then saves their
 * profile and a built-in plan running to their target date. Reachable again
 * later to retake it; answers are pre-filled from the saved profile.
 */
export default function Onboarding() {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const [today] = useState(todayISO);
  const appData = useAppDataQuery();
  const saveProfile = useSaveProfileMutation();
  const savePlan = useSavePlanMutation();
  const { draft, step, start, update, clear } = useOnboardingDraft();

  const existing = appData.data?.profile ?? null;
  const existingPlan = appData.data?.plan ?? null;
  // Set once the plan is saved, so clearing the draft doesn't re-seed it.
  const finished = useRef(false);
  useEffect(() => {
    if (finished.current || draft || appData.isLoading || appData.isError) return;
    start(
      existing
        ? draftFromProfile(
            {
              profile: existing,
              plan: existingPlan ?? undefined,
              latestWeightKg: appData.data?.weights.length
                ? currentWeight(appData.data.weights, existing.startWeightKg)
                : undefined,
            },
            today,
          )
        : initialDraft(today),
    );
  }, [
    draft,
    existing,
    existingPlan,
    appData.data,
    appData.isLoading,
    appData.isError,
    start,
    today,
  ]);

  if (appData.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-4">
        <ErrorState onRetry={() => appData.refetch()} />
      </main>
    );
  }

  if (!draft) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl space-y-6 bg-bg px-4 py-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  async function handleComplete(answers: OnboardingAnswers, mode: CompletionMode) {
    try {
      const now = new Date().toISOString();
      // Carrying on from the same start keeps the original start weight ("kg lost").
      const sameStart = existing && existingPlan?.startDate === answers.startDate;
      const profile = profileFromAnswers(
        answers,
        now,
        existing?.createdAt ?? now,
        sameStart ? existing.startWeightKg : answers.weightKg,
      );
      const plan = generatePlan(profile, answers.level, answers.startDate, { now });
      await saveProfile.mutateAsync(profile);
      await savePlan.mutateAsync(plan);
      finished.current = true;
      clear();
      toast.success(t('plan.created'));
      // The AI coach starts from the saved profile and the built-in plan as a draft.
      navigate(mode === 'ai' ? `${ROUTES.coach}?from=onboarding` : ROUTES.dashboard, {
        replace: true,
      });
    } catch (err) {
      logger.error('onboarding save failed', err);
      toast.error(t('plan.saveError'));
    }
  }

  function handleCancel() {
    finished.current = true;
    clear();
    navigate(ROUTES.settings, { replace: true });
  }

  return (
    <OnboardingWizard
      today={today}
      draft={draft}
      step={step}
      onStepChange={update}
      onComplete={handleComplete}
      aiEnabled={FEATURES.coach}
      saving={saveProfile.isPending || savePlan.isPending}
      // Only someone who already has a plan can leave without finishing.
      onCancel={existing && existingPlan ? handleCancel : undefined}
      currentStartDate={existingPlan?.startDate}
    />
  );
}
