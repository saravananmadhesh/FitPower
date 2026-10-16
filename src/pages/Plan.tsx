import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import { Dumbbell, Footprints, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { AiNotConnectedNotice } from '@/components/plan/AiNotConnectedNotice';
import { PlanLevelPicker } from '@/components/plan/PlanLevelPicker';
import { PlanSessions } from '@/components/plan/PlanSessions';
import { isSetUp, useAppDataQuery, type ReadyAppData } from '@/queries/useAppDataQuery';
import { useSavePlanMutation } from '@/queries/usePlan';
import { WEEKDAYS, phaseFor, sessionById, type TrainingPlan, type Weekday } from '@/domain/plan';
import { levelOfPlan, planEndDate, type PlanLevel } from '@/domain/planGenerator';
import {
  estimateSessionMinutes,
  longestSessionMinutes,
  trainingDaysPerWeek,
} from '@/domain/planRules';
import { hasInjury } from '@/domain/profile';
import { dayNumber, parseISO, todayISO } from '@/domain/dates';
import { currentWeight, targetsForProfile } from '@/domain/nutrition';
import { FEATURES } from '@/config/features';
import { ROUTES } from '@/routes';

/** 2024-01-01 was a Monday; used only to get localized weekday names. */
const MONDAY = new Date(2024, 0, 1);

function weekdayLabel(index: number, locale: string): string {
  const d = new Date(MONDAY);
  d.setDate(MONDAY.getDate() + index);
  return d.toLocaleDateString(locale, { weekday: 'short' });
}

function slotLabel(plan: TrainingPlan, day: Weekday, t: TFunction<'plans'>): string {
  const slot = plan.weekly[day];
  if (slot === 'walk') return t('split.walk');
  if (slot === 'rest') return t('split.rest');
  const session = sessionById(plan, slot);
  return `${slot} · ${session?.shortName ?? session?.name ?? slot}`;
}

export default function Plan() {
  const { data, isLoading, isError, refetch } = useAppDataQuery();

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }
  if (isLoading || !isSetUp(data)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <PlanContent data={data} />;
}

function PlanContent({ data }: { data: ReadyAppData }) {
  const { t, i18n } = useTranslation('plans');
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const savePlan = useSavePlanMutation();
  const { profile, plan } = data;
  const todayKey = todayISO();
  const rawDay = dayNumber(data.startDate, todayKey);
  const currentPhaseN = phaseFor(plan, rawDay).n;
  const activeLevel = levelOfPlan(plan);

  const weight = currentWeight(data.weights, profile.startWeightKg);
  const nutritionTargets = targetsForProfile(profile, weight, todayKey);
  const formatDate = (iso: string) =>
    parseISO(iso).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const goalMoves = t('goal.moves', { returnObjects: true }) as string[];
  const kneeRules = t('safety.knee', { returnObjects: true }) as string[];
  const weeklyRate = Math.abs(profile.startWeightKg - profile.goalWeightKg) / (plan.totalDays / 7);

  function handleChoose(next: TrainingPlan, level: PlanLevel) {
    const levelName = t(`levels.${level}.name`);
    savePlan.mutate(next, {
      onSuccess: () => toast.success(t('levels.switchedToast', { level: levelName })),
      onError: () => toast.error(t('levels.error')),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={tc('nav.plan')} description={t('description')} />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-caption text-text-muted">{t('active.title')}</p>
            <h3 className="text-h2 text-text">{plan.name}</h3>
          </div>
          <Badge variant="neutral">{t(`source.${plan.source}`)}</Badge>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-body-sm text-text-muted">
          <li>
            {t('active.days', {
              days: plan.totalDays,
              start: formatDate(plan.startDate),
              end: formatDate(planEndDate(plan)),
            })}
          </li>
          <li>{t('active.perWeek', { count: trainingDaysPerWeek(plan) })}</li>
          <li>{t('active.minutes', { count: longestSessionMinutes(plan) })}</li>
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Dumbbell className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <span className="text-body-sm text-text-muted">{t('active.kit')}:</span>
          {profile.equipment.map((eq) => (
            <Badge key={eq} variant="neutral">
              {t(`active.equipment.${eq}`)}
            </Badge>
          ))}
        </div>
        {plan.source !== 'ai' && (
          <AiNotConnectedNotice
            onConnect={FEATURES.coach ? () => navigate(ROUTES.coach) : undefined}
          />
        )}
      </Card>

      <Card>
        <h3 className="text-h3 text-text">{t('levels.title')}</h3>
        <p className="mb-4 mt-1 text-body-sm text-text-muted">{t('levels.description')}</p>
        <PlanLevelPicker
          profile={profile}
          startDate={data.startDate}
          activeLevel={activeLevel}
          confirmReplace
          saving={savePlan.isPending}
          onChoose={handleChoose}
        />
      </Card>

      <Card>
        <h3 className="text-h3 text-text">{t('goal.title')}</h3>
        <p className="mt-2 text-body-sm text-text-muted">
          {profile.goalType === 'fat-loss'
            ? `${t('goal.fat-loss', {
                start: profile.startWeightKg,
                goal: profile.goalWeightKg,
                days: plan.totalDays,
                rate: weeklyRate.toFixed(1),
              })} ${t(weeklyRate <= 1 ? 'goal.fatLossPaceOk' : 'goal.fatLossPaceFast')}`
            : t(`goal.${profile.goalType}`)}
        </p>
        <h4 className="mt-4 text-body font-medium text-text">{t('goal.movesTitle')}</h4>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-body-sm text-text-muted">
          {goalMoves.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ol>
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-info/30 bg-info-soft px-4 py-3">
          <Footprints className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
          <p className="text-body-sm text-text">{t('goal.homeKit')}</p>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-h3 text-text">
          {t('phases.title', { count: plan.phases.length })}
        </h3>
        <div className="divide-y divide-border">
          {plan.phases.map((phase) => (
            <div
              key={phase.n}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text">
                    {t('phases.phaseLabel', { n: phase.n, name: phase.name })}
                  </span>
                  <span className="text-caption text-text-muted">
                    {t('phases.days', { days: `${phase.startDay}–${phase.endDay}` })}
                  </span>
                  {phase.n === currentPhaseN && (
                    <Badge variant="neutral">{t('phases.current')}</Badge>
                  )}
                </div>
                {phase.note && <p className="mt-1 text-body-sm text-text-muted">{phase.note}</p>}
              </div>
              <span className="whitespace-nowrap text-body-sm text-text-muted">
                {t('phases.rounds', {
                  rounds: phase.rounds,
                  minutes: Math.max(...plan.sessions.map((s) => estimateSessionMinutes(s, phase))),
                })}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-h3 text-text">{t('split.title')}</h3>
        <table className="w-full text-body-sm">
          <tbody>
            {WEEKDAYS.map((day, i) => (
              <tr key={day} className="border-b border-border last:border-0">
                <th scope="row" className="py-2 pr-4 text-left font-medium text-text">
                  {weekdayLabel(i, i18n.language)}
                </th>
                <td className="py-2 text-text-muted">{slotLabel(plan, day, t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h3 className="text-h3 text-text">{t('sessions.title')}</h3>
        <p className="mb-4 mt-1 text-body-sm text-text-muted">{t('sessions.description')}</p>
        <PlanSessions plan={plan} />
      </Card>

      <Card>
        <h3 className="mb-1 text-h3 text-text">{t('nutrition.title')}</h3>
        <p className="mb-4 text-body-sm text-text-muted">
          {t('nutrition.description', {
            weight,
            height: profile.heightCm,
            adjust: t(`nutrition.adjust.${profile.goalType}`),
          })}
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <div className="tabular-nums text-h2 text-text">{nutritionTargets.bmr}</div>
            <div className="text-caption text-text-muted">{t('nutrition.bmr')}</div>
          </div>
          <div>
            <div className="tabular-nums text-h2 text-text">{nutritionTargets.tdee}</div>
            <div className="text-caption text-text-muted">{t('nutrition.tdee')}</div>
          </div>
          <div>
            <div className="tabular-nums text-h2 font-semibold text-text">
              {nutritionTargets.kcal}
            </div>
            <div className="text-caption text-text-muted">{t('nutrition.target')}</div>
          </div>
          <div>
            <div className="tabular-nums text-h2 text-text">{nutritionTargets.pro}g</div>
            <div className="text-caption text-text-muted">{t('nutrition.protein')}</div>
          </div>
          <div>
            <div className="tabular-nums text-h2 text-text">3.0L</div>
            <div className="text-caption text-text-muted">{t('nutrition.water')}</div>
          </div>
        </div>
        <p className="mt-4 text-caption text-text-muted">
          {t('nutrition.goalHint', { start: profile.startWeightKg, goal: profile.goalWeightKg })}
        </p>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-h3 text-text">
          <ShieldCheck className="h-5 w-5 text-text-muted" aria-hidden="true" />
          {t('safety.title')}
        </h3>
        {plan.notes.length > 0 && (
          <ul className="list-disc space-y-1.5 pl-5 text-body-sm text-text-muted">
            {plan.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        {hasInjury(profile, 'knee') && (
          <>
            <h4 className="mb-2 mt-4 text-body font-medium text-text">{t('safety.kneeTitle')}</h4>
            <ul className="list-disc space-y-1.5 pl-5 text-body-sm text-text-muted">
              {kneeRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-4 text-caption text-text-muted">{t('safety.disclaimer')}</p>
      </Card>
    </div>
  );
}
