import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { CalendarGrid } from '@/components/schedule/CalendarGrid';
import { CalendarLegend } from '@/components/schedule/CalendarLegend';
import { useAppDataQuery } from '@/queries/useAppDataQuery';
import { useSetStartDateMutation, useToggleDoneMutation } from '@/queries/useAppDataMutations';
import { todayISO } from '@/domain/dates';
import { PROGRAM_DAYS } from '@/domain/constants';
import type { AppData } from '@/types';

export default function Schedule() {
  const { data, isLoading, isError, refetch } = useAppDataQuery();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return <ScheduleContent data={data} />;
}

function ScheduleContent({ data }: { data: AppData }) {
  const { t } = useTranslation();
  const toggleDone = useToggleDoneMutation();
  const setStartDate = useSetStartDateMutation();
  const todayKey = todayISO();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.schedule')}
        description={t('schedule.description', { total: PROGRAM_DAYS })}
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-sm text-text-muted">{t('schedule.tapHint')}</p>
          <label className="flex items-center gap-2 text-body-sm text-text-muted">
            {t('schedule.startDate')}
            <Input
              type="date"
              value={data.startDate}
              onChange={(e) => e.target.value && setStartDate.mutate(e.target.value)}
              className="w-auto"
            />
          </label>
        </div>

        <CalendarGrid
          startDate={data.startDate}
          todayKey={todayKey}
          done={data.done}
          onToggle={(key) => toggleDone.mutate(key)}
        />

        <div className="mt-4">
          <CalendarLegend />
        </div>
      </Card>
    </div>
  );
}
