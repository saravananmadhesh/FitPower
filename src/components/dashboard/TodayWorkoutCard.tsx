import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { LIB, type DayType, type PhaseConfig } from '@/domain/program';
import { ROUTES } from '@/routes';
import { cn } from '@/utils/cn';

interface TodayWorkoutCardProps {
  dayType: DayType;
  phase: PhaseConfig;
  isDone: boolean;
  isWalked: boolean;
  onToggleWalk: () => void;
  dateLabel: string;
}

export function TodayWorkoutCard({
  dayType,
  phase,
  isDone,
  isWalked,
  onToggleWalk,
  dateLabel,
}: TodayWorkoutCardProps) {
  const { t } = useTranslation();
  const isRest = dayType === 'R';
  const session = isRest ? null : LIB[dayType];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-text">{t('dashboard.today.title', { date: dateLabel })}</h3>
        <Badge variant={isRest ? 'neutral' : 'accent'}>
          {isRest ? t('dashboard.today.rest') : session!.focus}
        </Badge>
      </div>
      {isRest ? (
        <div className="mt-3 space-y-3">
          <p className="text-body-sm text-text-muted">{t('dashboard.today.restDescription')}</p>
          {isWalked ? (
            <Badge variant="success">{t('dashboard.today.walkLogged')}</Badge>
          ) : (
            <Button variant="secondary" size="sm" onClick={onToggleWalk}>
              {t('dashboard.today.logWalk')}
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-body font-medium text-text">
              {dayType} · {session!.name}
            </p>
            <p className="text-body-sm text-text-muted">
              {t('dashboard.today.exerciseCount', { count: session!.exercises.length })} ·{' '}
              {t('dashboard.today.phase', { n: phase.n, rounds: phase.rounds })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={ROUTES.workout}
              className={cn(buttonVariants({ variant: 'primary', size: 'sm' }))}
            >
              {t('dashboard.today.goToWorkout')}
            </Link>
            {isDone && <Badge variant="success">{t('dashboard.today.completed')}</Badge>}
          </div>
        </div>
      )}
    </Card>
  );
}
