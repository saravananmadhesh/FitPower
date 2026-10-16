import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonVariants } from '@/components/ui/buttonVariants';
import type { PlanPhase, PlanSession } from '@/domain/plan';
import { ROUTES } from '@/routes';
import { cn } from '@/utils/cn';

interface TodayWorkoutCardProps {
  /** Today's session, or null on a walk/rest day. */
  session: PlanSession | null;
  phase: PlanPhase;
  isDone: boolean;
  isWalked: boolean;
  onToggleWalk: () => void;
  dateLabel: string;
}

export function TodayWorkoutCard({
  session,
  phase,
  isDone,
  isWalked,
  onToggleWalk,
  dateLabel,
}: TodayWorkoutCardProps) {
  const { t } = useTranslation();
  const isRest = session === null;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-text">{t('dashboard.today.title', { date: dateLabel })}</h3>
        <Badge variant={isRest ? 'neutral' : 'accent'}>
          {session ? session.focus : t('dashboard.today.rest')}
        </Badge>
      </div>
      {!session ? (
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
              {session.id} · {session.name}
            </p>
            <p className="text-body-sm text-text-muted">
              {t('dashboard.today.exerciseCount', { count: session.exercises.length })} ·{' '}
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
