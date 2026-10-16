import { useTranslation } from 'react-i18next';
import { Footprints } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAppDataQuery } from '@/queries/useAppDataQuery';
import { PHASES, SPLIT, phaseForDay } from '@/domain/program';
import { dayNumber, todayISO } from '@/domain/dates';
import { currentWeight, targets } from '@/domain/nutrition';
import { GOAL_WEIGHT_KG, HEIGHT_CM, PROGRAM_DAYS, START_WEIGHT_KG } from '@/domain/constants';
import type { AppData } from '@/types';

export default function Plan() {
  const { data, isLoading, isError, refetch } = useAppDataQuery();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return <PlanContent data={data} />;
}

function PlanContent({ data }: { data: AppData }) {
  const { t } = useTranslation();
  const todayKey = todayISO();
  const rawDay = dayNumber(data.startDate, todayKey);
  const clampedDay = Math.max(1, Math.min(PROGRAM_DAYS, rawDay));
  const currentPhaseN = phaseForDay(clampedDay, PROGRAM_DAYS);

  const weight = currentWeight(data.weights, START_WEIGHT_KG);
  const nutritionTargets = targets(weight, HEIGHT_CM);

  const goalPoints = t('plan.goal.moves.items', { returnObjects: true }) as string[];
  const kneeRules = t('plan.kneeRules.items', { returnObjects: true }) as string[];

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.plan')} description={t('plan.description')} />

      <Card>
        <h3 className="text-h3 text-text">{t('plan.goal.title')}</h3>
        <p className="mt-2 text-body-sm text-text-muted">{t('plan.goal.honest')}</p>
        <h4 className="mt-4 text-body font-medium text-text">{t('plan.goal.movesTitle')}</h4>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-body-sm text-text-muted">
          {goalPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ol>
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-info/30 bg-info-soft px-4 py-3">
          <Footprints className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
          <p className="text-body-sm text-text">{t('plan.goal.stepsTip')}</p>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-h3 text-text">{t('plan.phases.title')}</h3>
        <div className="divide-y divide-border">
          {PHASES.map((phase) => (
            <div
              key={phase.n}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text">
                    {t('plan.phases.phaseLabel', { n: phase.n, name: phase.name })}
                  </span>
                  <span className="text-caption text-text-subtle">
                    {t('plan.phases.days', { days: phase.days })}
                  </span>
                  {phase.n === currentPhaseN && (
                    <Badge variant="accent">{t('plan.phases.current')}</Badge>
                  )}
                </div>
                <p className="mt-1 text-body-sm text-text-muted">{phase.note}</p>
              </div>
              <span className="whitespace-nowrap text-body-sm text-text-muted">
                {t('plan.phases.rounds', {
                  rounds: phase.rounds,
                  work: phase.work,
                  rest: phase.rest,
                })}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-h3 text-text">{t('plan.split.title')}</h3>
        <table className="w-full text-body-sm">
          <tbody>
            {SPLIT.map(([day, session]) => (
              <tr key={day} className="border-b border-border last:border-0">
                <td className="py-2 pr-4 font-medium text-text">{day}</td>
                <td className="py-2 text-text-muted">{session}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h3 className="mb-1 text-h3 text-text">{t('plan.nutrition.title')}</h3>
        <p className="mb-4 text-body-sm text-text-muted">
          {t('plan.nutrition.description', { weight })}
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <div className="tabular-nums text-h2 text-text">{nutritionTargets.bmr}</div>
            <div className="text-caption text-text-muted">{t('plan.nutrition.bmr')}</div>
          </div>
          <div>
            <div className="tabular-nums text-h2 text-text">{nutritionTargets.tdee}</div>
            <div className="text-caption text-text-muted">{t('plan.nutrition.tdee')}</div>
          </div>
          <div>
            <div className="tabular-nums text-h2 text-accent">{nutritionTargets.kcal}</div>
            <div className="text-caption text-text-muted">{t('plan.nutrition.target')}</div>
          </div>
          <div>
            <div className="tabular-nums text-h2 text-text">{nutritionTargets.pro}g</div>
            <div className="text-caption text-text-muted">{t('plan.nutrition.protein')}</div>
          </div>
          <div>
            <div className="tabular-nums text-h2 text-text">3.0L</div>
            <div className="text-caption text-text-muted">{t('plan.nutrition.water')}</div>
          </div>
        </div>
        <p className="mt-4 text-caption text-text-subtle">
          {t('plan.nutrition.goalHint', { start: START_WEIGHT_KG, goal: GOAL_WEIGHT_KG })}
        </p>
      </Card>

      <Card>
        <h3 className="mb-3 text-h3 text-text">{t('plan.kneeRules.title')}</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-body-sm text-text-muted">
          {kneeRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
