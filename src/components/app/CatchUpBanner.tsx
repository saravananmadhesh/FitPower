import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

interface CatchUpBannerProps {
  missedCount: number;
  isTodayTrainingDay: boolean;
}

export function CatchUpBanner({ missedCount, isTodayTrainingDay }: CatchUpBannerProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3">
      <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
      <p className="text-body-sm text-text">
        {t('dashboard.catchUpBanner.missed', { count: missedCount })}{' '}
        {isTodayTrainingDay
          ? t('dashboard.catchUpBanner.todayIsTrainingDay')
          : t('dashboard.catchUpBanner.fitInMakeup')}
      </p>
    </div>
  );
}
