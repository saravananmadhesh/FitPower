import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { WeightTrendChart } from '@/components/charts/WeightTrendChart';
import { WeightLogForm } from '@/components/progress/WeightLogForm';
import { WeightHistoryTable } from '@/components/progress/WeightHistoryTable';
import { MeasurementForm } from '@/components/progress/MeasurementForm';
import { MeasurementHistoryTable } from '@/components/progress/MeasurementHistoryTable';
import { useAppDataQuery } from '@/queries/useAppDataQuery';
import {
  useDeleteMeasurementMutation,
  useDeleteWeightMutation,
  useSaveMeasurementMutation,
  useSaveWeightMutation,
} from '@/queries/useAppDataMutations';
import { GOAL_WEIGHT_KG } from '@/domain/constants';
import type { MeasurementFormValues, WeightFormValues } from '@/domain/formSchemas';
import type { AppData } from '@/types';

export default function Progress() {
  const { data, isLoading, isError, refetch } = useAppDataQuery();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return <ProgressContent data={data} />;
}

function ProgressContent({ data }: { data: AppData }) {
  const { t } = useTranslation();
  const saveWeight = useSaveWeightMutation();
  const deleteWeight = useDeleteWeightMutation();
  const saveMeasurement = useSaveMeasurementMutation();
  const deleteMeasurement = useDeleteMeasurementMutation();

  function handleSaveWeight(values: WeightFormValues) {
    saveWeight.mutate(values, {
      onSuccess: () => toast.success(t('progress.weight.savedToast')),
    });
  }

  function handleSaveMeasurement(values: MeasurementFormValues) {
    saveMeasurement.mutate(
      {
        date: values.date,
        waist: values.waist ?? null,
        chest: values.chest ?? null,
        hip: values.hip ?? null,
      },
      { onSuccess: () => toast.success(t('progress.measure.savedToast')) },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.progress')} description={t('progress.description')} />

      <Card>
        <h3 className="mb-3 text-h3 text-text">{t('progress.weight.logTitle')}</h3>
        <WeightLogForm onSave={handleSaveWeight} />
      </Card>

      <Card>
        <h3 className="mb-4 text-h3 text-text">{t('progress.weight.trendTitle')}</h3>
        <WeightTrendChart weights={data.weights} goalKg={GOAL_WEIGHT_KG} />
      </Card>

      <Card>
        <h3 className="mb-4 text-h3 text-text">{t('progress.weight.historyTitle')}</h3>
        <WeightHistoryTable weights={data.weights} onDelete={(date) => deleteWeight.mutate(date)} />
      </Card>

      <Card>
        <h3 className="mb-3 text-h3 text-text">{t('progress.measure.title')}</h3>
        <p className="mb-4 text-body-sm text-text-muted">{t('progress.measure.hint')}</p>
        <MeasurementForm onSave={handleSaveMeasurement} />
        <div className="mt-6">
          <MeasurementHistoryTable
            measurements={data.measure}
            onDelete={(date) => deleteMeasurement.mutate(date)}
          />
        </div>
      </Card>
    </div>
  );
}
