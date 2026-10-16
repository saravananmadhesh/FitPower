import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, ClipboardList, Footprints, Moon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { WEEKDAYS, isTrainingSlot, type TrainingPlan } from '@/domain/plan';
import { parseISO } from '@/domain/dates';
import type { ProposalStatus } from '@/ai/chatStore';
import type { PlanFitWarning } from '@/ai/validatePlan';

/** 2024-01-01 was a Monday; used only to get localized weekday names. */
const MONDAY = new Date(2024, 0, 1);

function weekdayLabel(index: number, locale: string): string {
  const d = new Date(MONDAY);
  d.setDate(MONDAY.getDate() + index);
  return d.toLocaleDateString(locale, { weekday: 'short' });
}

interface PlanProposalCardProps {
  plan: TrainingPlan;
  /** Schedule mismatches found by the shared plan rules (more days or longer sessions than the user has). */
  fit?: PlanFitWarning[];
  status: ProposalStatus;
  saving?: boolean;
  onAccept: () => void;
  onAskChanges: () => void;
}

export function PlanProposalCard({
  plan,
  fit = [],
  status,
  saving,
  onAccept,
  onAskChanges,
}: PlanProposalCardProps) {
  const { t, i18n } = useTranslation('coach');
  const start = parseISO(plan.startDate).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <section
      aria-label={t('proposal.planTitle')}
      className="rounded-xl border border-accent/40 bg-card p-4 shadow-e1"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-accent" aria-hidden="true" />
          <div>
            <p className="text-caption uppercase tracking-wide text-text-muted">
              {t('proposal.planTitle')}
            </p>
            <h3 className="text-h3 text-text">{plan.name}</h3>
          </div>
        </div>
        {status === 'accepted' && (
          <Badge className="gap-1 text-text">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            {t('proposal.accepted')}
          </Badge>
        )}
        {status === 'dismissed' && <Badge>{t('proposal.dismissed')}</Badge>}
      </div>
      <p className="mt-2 text-body-sm text-text-muted">
        {t('proposal.planMeta', {
          days: plan.totalDays,
          start,
          sessions: plan.sessions.length,
          phases: plan.phases.length,
        })}
      </p>

      {fit.length > 0 && (
        <div className="mt-3 rounded-lg border border-warning/40 bg-card-2 px-3 py-2">
          <h4 className="flex items-center gap-1.5 text-body-sm font-medium text-text">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
            {t('proposal.fitTitle')}
          </h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-body-sm text-text-muted">
            {fit.map((w, i) => (
              <li key={i}>
                {w.code === 'too-many-days'
                  ? t('proposal.fitDays', { days: w.days, max: w.max })
                  : t('proposal.fitLength', {
                      session: w.session,
                      minutes: w.minutes,
                      max: w.max,
                    })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h4 className="mt-4 text-body-sm font-medium text-text">{t('proposal.weekly')}</h4>
      <ul className="mt-2 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day, i) => {
          const slot = plan.weekly[day];
          const training = isTrainingSlot(slot);
          return (
            <li
              key={day}
              className={
                training
                  ? 'rounded-md border border-accent/40 bg-accent-soft px-1 py-1.5 text-text'
                  : 'rounded-md bg-card-2 px-1 py-1.5 text-text-muted'
              }
            >
              <span className="block text-caption">{weekdayLabel(i, i18n.language)}</span>
              {training ? (
                <span className="block truncate text-body-sm font-medium">{slot}</span>
              ) : (
                <span className="flex justify-center py-0.5">
                  {slot === 'walk' ? (
                    <Footprints className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="sr-only sm:not-sr-only sm:ml-1 sm:text-body-sm">
                    {slot === 'walk' ? t('proposal.walk') : t('proposal.rest')}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <h4 className="mt-4 text-body-sm font-medium text-text">{t('proposal.sessions')}</h4>
      <div className="mt-2 space-y-2">
        {plan.sessions.map((s) => (
          <details key={s.id} className="rounded-lg border border-border bg-card-2 px-3 py-2">
            <summary className="cursor-pointer text-body-sm text-text">
              <span className="font-medium">{s.id}</span> · {s.name}{' '}
              <span className="text-text-muted">({s.focus})</span>
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-body-sm text-text-muted">
              {s.exercises.map((ex, i) => (
                <li key={`${ex.name}-${i}`}>
                  <span className="text-text">{ex.name}</span> · {ex.reps}
                  {ex.note ? ` · ${ex.note}` : ''}
                </li>
              ))}
            </ol>
            {s.note && <p className="mt-2 text-caption text-text-muted">{s.note}</p>}
          </details>
        ))}
      </div>

      <h4 className="mt-4 text-body-sm font-medium text-text">{t('proposal.phases')}</h4>
      <ol className="mt-2 space-y-1 text-body-sm">
        {plan.phases.map((p) => (
          <li key={p.n} className="text-text-muted">
            <span className="font-medium text-text">
              {p.n}. {p.name}
            </span>{' '}
            ·{' '}
            {t('proposal.phaseLine', {
              start: p.startDay,
              end: p.endDay,
              rounds: p.rounds,
              work: p.work,
              rest: p.rest,
            })}
          </li>
        ))}
      </ol>

      {plan.notes.length > 0 && (
        <>
          <h4 className="mt-4 text-body-sm font-medium text-text">{t('proposal.notes')}</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-body-sm text-text-muted">
            {plan.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      )}

      {status === 'pending' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={onAccept}
            loading={saving}
            leftIcon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          >
            {t('proposal.accept')}
          </Button>
          <Button variant="secondary" onClick={onAskChanges} disabled={saving}>
            {t('proposal.askChanges')}
          </Button>
        </div>
      )}
    </section>
  );
}
