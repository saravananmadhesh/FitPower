import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { RingStat } from '@/components/charts/RingStat';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { QuickAddForm } from '@/components/nutrition/QuickAddForm';
import { StepsForm } from '@/components/nutrition/StepsForm';
import { useAppDataQuery } from '@/queries/useAppDataQuery';
import {
  useAddNutritionMutation,
  useResetNutritionDayMutation,
  useSetStepsMutation,
} from '@/queries/useAppDataMutations';
import { currentWeight, targets } from '@/domain/nutrition';
import { addDays, formatISO, todayISO } from '@/domain/dates';
import { HEIGHT_CM, START_WEIGHT_KG } from '@/domain/constants';
import type { AppData } from '@/types';

export default function Nutrition() {
  const { data, isLoading, isError, refetch } = useAppDataQuery();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return <NutritionContent data={data} />;
}

function NutritionContent({ data }: { data: AppData }) {
  const { t } = useTranslation();
  const addNutrition = useAddNutritionMutation();
  const setSteps = useSetStepsMutation();
  const resetDay = useResetNutritionDayMutation();

  const todayKey = todayISO();
  const today = new Date();
  const nutritionToday = data.nutrition[todayKey] ?? { kcal: 0, pro: 0, water: 0, steps: 0 };
  const weight = currentWeight(data.weights, START_WEIGHT_KG);
  const nutritionTargets = targets(weight, HEIGHT_CM);

  const activityData = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    const key = formatISO(d);
    return {
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      value: data.nutrition[key]?.kcal ?? 0,
    };
  });

  function handleReset() {
    if (window.confirm(t('nutrition.resetConfirm'))) {
      resetDay.mutate(todayKey, { onSuccess: () => toast.success(t('nutrition.resetToast')) });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.nutrition')}
        description={today.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })}
      />

      <Card>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3">
            <RingStat
              label={t('nutrition.rings.calories')}
              value={nutritionToday.kcal}
              target={nutritionTargets.kcal}
              colorClassName="stroke-accent"
            />
            <QuickAddForm
              ariaLabel={t('nutrition.calories.addLabel')}
              placeholder={t('nutrition.calories.placeholder')}
              buttonLabel={t('nutrition.add')}
              onAdd={(amount) => addNutrition.mutate({ date: todayKey, field: 'kcal', amount })}
            />
          </div>
          <div className="flex flex-col items-center gap-3">
            <RingStat
              label={t('nutrition.rings.protein')}
              value={nutritionToday.pro}
              target={nutritionTargets.pro}
              unit="g"
              colorClassName="stroke-teal"
            />
            <QuickAddForm
              ariaLabel={t('nutrition.protein.addLabel')}
              placeholder={t('nutrition.protein.placeholder')}
              buttonLabel={t('nutrition.add')}
              onAdd={(amount) => addNutrition.mutate({ date: todayKey, field: 'pro', amount })}
            />
          </div>
          <div className="flex flex-col items-center gap-3">
            <RingStat
              label={t('nutrition.rings.water')}
              value={nutritionToday.water}
              target={3000}
              unit="ml"
              colorClassName="stroke-info"
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addNutrition.mutate({ date: todayKey, field: 'water', amount: 250 })}
              >
                {t('nutrition.water.add250')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addNutrition.mutate({ date: todayKey, field: 'water', amount: 500 })}
              >
                {t('nutrition.water.add500')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-h3 text-text">{t('nutrition.steps.title')}</h3>
        <p className="mb-3 tabular-nums text-display text-text">
          {nutritionToday.steps.toLocaleString()}{' '}
          <span className="text-body-sm text-text-muted">/ 7,000–10,000</span>
        </p>
        <StepsForm onSet={(steps) => setSteps.mutate({ date: todayKey, steps })} />
        <p className="mt-2 text-caption text-text-subtle">{t('nutrition.steps.hint')}</p>
      </Card>

      <Card>
        <h3 className="mb-4 text-h3 text-text">{t('nutrition.activity.title')}</h3>
        <ActivityChart
          data={activityData}
          target={nutritionTargets.kcal}
          ariaLabel={t('dashboard.activity.ariaLabel')}
        />
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleReset} loading={resetDay.isPending}>
          {t('nutrition.resetToday')}
        </Button>
      </div>
    </div>
  );
}
