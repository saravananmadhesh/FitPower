import { useTranslation } from 'react-i18next';
import { CalendarCheck2, Flame, Scale, TrendingDown } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { BackupBanner } from '@/components/app/BackupBanner';
import { CatchUpBanner } from '@/components/app/CatchUpBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/dashboard/StatCard';
import { TodayWorkoutCard } from '@/components/dashboard/TodayWorkoutCard';
import { ScheduleStrip } from '@/components/dashboard/ScheduleStrip';
import { StreakWidget } from '@/components/dashboard/StreakWidget';
import { WeightTrendChart } from '@/components/charts/WeightTrendChart';
import { RingStat } from '@/components/charts/RingStat';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { useAppDataQuery } from '@/queries/useAppDataQuery';
import {
  useRecordBackupMutation,
  useSnoozeBackupMutation,
  useToggleWalkMutation,
} from '@/queries/useAppDataMutations';
import { currentWeight, targets } from '@/domain/nutrition';
import { backupDue, missedCount, streakCount, weekStats } from '@/domain/metrics';
import { addDays, dayNumber, formatISO, todayISO } from '@/domain/dates';
import { PHASES, phaseForDay, typeForDate } from '@/domain/program';
import { GOAL_WEIGHT_KG, HEIGHT_CM, PROGRAM_DAYS, START_WEIGHT_KG } from '@/domain/constants';
import { downloadJson } from '@/utils/downloadJson';

export default function Dashboard() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useAppDataQuery();
  const toggleWalk = useToggleWalkMutation();
  const recordBackup = useRecordBackupMutation();
  const snoozeBackup = useSnoozeBackupMutation();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const today = new Date();
  const todayKey = todayISO();
  const weight = currentWeight(data.weights, START_WEIGHT_KG);
  const nutritionTargets = targets(weight, HEIGHT_CM);
  const streak = streakCount(data.startDate, data.done, todayKey, PROGRAM_DAYS);
  const week = weekStats(todayKey, data.done);
  const missed = missedCount(data.startDate, todayKey, data.done, PROGRAM_DAYS);
  const rawDay = dayNumber(data.startDate, todayKey);
  const displayDay = Math.max(0, Math.min(PROGRAM_DAYS, rawDay));
  const clampedDay = Math.max(1, Math.min(PROGRAM_DAYS, rawDay));
  const phase = PHASES[phaseForDay(clampedDay, PROGRAM_DAYS) - 1];
  const dayType = typeForDate(today);
  const nutritionToday = data.nutrition[todayKey] ?? { kcal: 0, pro: 0, water: 0, steps: 0 };
  const hasAnyData = data.weights.length > 0 || Object.keys(data.done).length > 0;
  const isBackupDue = backupDue(todayKey, data.lastBackup, data.backupSnoozeUntil, hasAnyData);
  const isTodayTrainingDay = dayType !== 'R' && !data.done[todayKey];

  const activityData = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    const key = formatISO(d);
    return {
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      value: data.nutrition[key]?.kcal ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      {isBackupDue && (
        <BackupBanner
          loading={recordBackup.isPending}
          onBackupNow={() => {
            downloadJson(`fitpower-backup-${todayKey}.json`, data);
            recordBackup.mutate(todayKey);
          }}
          onSnooze={() => snoozeBackup.mutate(formatISO(addDays(today, 3)))}
        />
      )}
      {missed > 0 && <CatchUpBanner missedCount={missed} isTodayTrainingDay={isTodayTrainingDay} />}

      <PageHeader
        title={t('nav.dashboard')}
        description={t('dashboard.subtitle', { day: displayDay, total: PROGRAM_DAYS })}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Scale}
          label={t('dashboard.stats.currentWeight')}
          value={`${weight.toFixed(1)} kg`}
          delta={{
            label: `${(weight - START_WEIGHT_KG).toFixed(1)} kg`,
            direction:
              weight < START_WEIGHT_KG ? 'down' : weight > START_WEIGHT_KG ? 'up' : 'neutral',
          }}
        />
        <StatCard
          icon={TrendingDown}
          label={t('dashboard.stats.kgLost')}
          value={`${Math.max(0, START_WEIGHT_KG - weight).toFixed(1)} kg`}
        />
        <StatCard
          icon={Flame}
          label={t('dashboard.stats.streak')}
          value={String(streak)}
          highlight={streak > 0}
        />
        <StatCard
          icon={CalendarCheck2}
          label={t('dashboard.stats.thisWeek')}
          value={`${week.done}/${week.total}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-h3 text-text">{t('dashboard.weightChart.title')}</h3>
          <WeightTrendChart weights={data.weights} goalKg={GOAL_WEIGHT_KG} />
        </Card>
        <Card>
          <h3 className="mb-4 text-h3 text-text">{t('dashboard.rings.title')}</h3>
          <div className="flex flex-wrap justify-around gap-4">
            <RingStat
              label={t('dashboard.rings.calories')}
              value={nutritionToday.kcal}
              target={nutritionTargets.kcal}
              colorClassName="stroke-accent"
            />
            <RingStat
              label={t('dashboard.rings.water')}
              value={nutritionToday.water}
              target={3000}
              unit="ml"
              colorClassName="stroke-info"
            />
            <RingStat
              label={t('dashboard.rings.steps')}
              value={nutritionToday.steps}
              target={10000}
              colorClassName="stroke-teal"
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <TodayWorkoutCard
            dayType={dayType}
            phase={phase}
            isDone={Boolean(data.done[todayKey])}
            isWalked={Boolean(data.walks[todayKey])}
            onToggleWalk={() => toggleWalk.mutate(todayKey)}
            dateLabel={today.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          />
          <Card>
            <h3 className="mb-3 text-h3 text-text">{t('dashboard.scheduleStrip.title')}</h3>
            <ScheduleStrip
              today={today}
              todayKey={todayKey}
              startDate={data.startDate}
              done={data.done}
            />
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-h3 text-text">{t('dashboard.activity.title')}</h3>
            <ActivityChart
              data={activityData}
              target={nutritionTargets.kcal}
              ariaLabel={t('dashboard.activity.ariaLabel')}
            />
          </Card>
          <StreakWidget streak={streak} />
        </div>
      </div>
    </div>
  );
}
