import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { generatePlan, PLAN_LEVELS, recommendLevel, type PlanLevel } from '@/domain/planGenerator';
import { longestSessionMinutes, trainingDaysPerWeek } from '@/domain/planRules';
import type { TrainingPlan } from '@/domain/plan';
import type { UserProfile } from '@/domain/profile';
import { cn } from '@/utils/cn';

export interface PlanLevelPickerProps {
  profile: UserProfile;
  /** Day 1 of the generated plan. */
  startDate: string;
  /** Level of the plan in use, if it is a built-in one. */
  activeLevel?: PlanLevel | null;
  /** Ask before replacing an existing plan. */
  confirmReplace?: boolean;
  saving?: boolean;
  onChoose: (plan: TrainingPlan, level: PlanLevel) => void;
}

interface LevelPreview {
  level: PlanLevel;
  plan: TrainingPlan;
  days: number;
  sets: number;
  minMoves: number;
  maxMoves: number;
  minutes: number;
}

/**
 * Easy / Intermediate / Hard built-in plans for a profile, with the
 * recommended one marked. Reused by first-run onboarding and the Plan page.
 */
export function PlanLevelPicker({
  profile,
  startDate,
  activeLevel = null,
  confirmReplace = false,
  saving = false,
  onChoose,
}: PlanLevelPickerProps) {
  const { t } = useTranslation('plans');
  const [pending, setPending] = useState<LevelPreview | null>(null);
  const recommendation = useMemo(() => recommendLevel(profile), [profile]);

  const previews = useMemo<LevelPreview[]>(
    () =>
      PLAN_LEVELS.map((level) => {
        const plan = generatePlan(profile, level, startDate);
        const moves = plan.sessions.map((s) => s.exercises.length);
        return {
          level,
          plan,
          days: trainingDaysPerWeek(plan),
          sets: Math.max(...plan.phases.map((p) => p.rounds)),
          minMoves: Math.min(...moves),
          maxMoves: Math.max(...moves),
          minutes: longestSessionMinutes(plan),
        };
      }),
    [profile, startDate],
  );

  const reasons = recommendation.reasons.map((r) => t(`recommend.reasons.${r}`)).join(', ');

  function choose(preview: LevelPreview) {
    if (confirmReplace) setPending(preview);
    else onChoose(preview.plan, preview.level);
  }

  return (
    <div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {previews.map((preview) => {
          const { level } = preview;
          const isActive = level === activeLevel;
          const isRecommended = level === recommendation.level;
          const name = t(`levels.${level}.name`);
          return (
            <li
              key={level}
              className={cn(
                'flex flex-col rounded-lg border bg-card-2 p-4',
                isActive || isRecommended ? 'border-accent' : 'border-border',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-h3 text-text">{name}</h4>
                {isRecommended && <Badge variant="neutral">{t('levels.recommended')}</Badge>}
                {isActive && <Badge variant="neutral">{t('levels.current')}</Badge>}
              </div>
              <p className="mt-2 text-body-sm text-text-muted">{t(`levels.${level}.blurb`)}</p>
              <ul className="mt-3 space-y-1 text-body-sm text-text">
                <li>{t('levels.stats.days', { count: preview.days })}</li>
                <li>
                  {preview.minMoves === preview.maxMoves
                    ? t('levels.stats.movesSame', { count: preview.minMoves })
                    : t('levels.stats.moves', { min: preview.minMoves, max: preview.maxMoves })}
                </li>
                <li>{t('levels.stats.sets', { count: preview.sets })}</li>
                <li>{t('levels.stats.minutes', { count: preview.minutes })}</li>
              </ul>
              <div className="mt-auto pt-4">
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={isActive || saving}
                  leftIcon={isActive ? <Check className="h-4 w-4" aria-hidden="true" /> : undefined}
                  aria-label={isActive ? undefined : `${t('levels.use')}: ${name}`}
                  onClick={() => choose(preview)}
                >
                  {isActive ? t('levels.current') : t('levels.use')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-caption text-text-muted">{t('recommend.why', { reasons })}</p>

      <Dialog.Root open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-overlay">
            <Dialog.Title className="text-h3 text-text">
              {t('levels.confirm.title', {
                level: pending ? t(`levels.${pending.level}.name`) : '',
              })}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-body-sm text-text-muted">
              {t('levels.confirm.body')}
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost">{t('levels.confirm.cancel')}</Button>
              </Dialog.Close>
              <Button
                loading={saving}
                onClick={() => {
                  if (!pending) return;
                  onChoose(pending.plan, pending.level);
                  setPending(null);
                }}
              >
                {t('levels.confirm.confirm')}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
