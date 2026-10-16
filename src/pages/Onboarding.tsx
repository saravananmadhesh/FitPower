import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSaveProfileMutation } from '@/queries/useProfile';
import { useSavePlanMutation } from '@/queries/usePlan';
import { legacyPlan, legacyProfile } from '@/domain/plans/legacy';
import { todayISO } from '@/domain/dates';
import { ROUTES } from '@/routes';

/**
 * Placeholder for the first-run wizard (release-plan workstream 1). Until it
 * lands, this offers the original program so a fresh install isn't stuck.
 */
export default function Onboarding() {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const saveProfile = useSaveProfileMutation();
  const savePlan = useSavePlanMutation();

  async function handleStart() {
    const today = todayISO();
    await saveProfile.mutateAsync(legacyProfile(today, today));
    await savePlan.mutateAsync(legacyPlan(today));
    navigate(ROUTES.dashboard, { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <Card className="flex max-w-md flex-col items-center gap-4 text-center">
        <Dumbbell className="h-10 w-10 text-accent" aria-hidden="true" />
        <h1 className="text-h2 text-text">{t('placeholder.title')}</h1>
        <p className="text-body-sm text-text-muted">{t('placeholder.body')}</p>
        <Button onClick={handleStart} loading={saveProfile.isPending || savePlan.isPending}>
          {t('placeholder.start')}
        </Button>
      </Card>
    </main>
  );
}
