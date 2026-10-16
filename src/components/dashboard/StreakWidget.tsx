import { Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

interface StreakWidgetProps {
  streak: number;
}

export function StreakWidget({ streak }: StreakWidgetProps) {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <Flame
        className={cn('h-8 w-8', streak > 0 ? 'text-warning' : 'text-text-subtle')}
        aria-hidden="true"
      />
      <div className="tabular-nums text-display text-text">{streak}</div>
      <div className="text-body-sm text-text-muted">{t('dashboard.streak.label')}</div>
    </Card>
  );
}
