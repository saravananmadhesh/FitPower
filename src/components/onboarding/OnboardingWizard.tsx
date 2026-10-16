import { useEffect, useMemo, useRef } from 'react';
import { FormProvider, useForm, type FieldValues, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Dumbbell } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ONBOARDING_STEPS,
  recommendLevel,
  schemaForStep,
  type OnboardingAnswers,
  type OnboardingDraft,
  type OnboardingStep,
} from '@/domain/onboarding';
import { StepFields } from './steps';

/** Fields stored as numbers but edited through radio groups (string values). */
const RADIO_NUMBER_FIELDS = ['dietRating', 'healthRating', 'daysPerWeek', 'minutesPerSession'];

function toFormValues(draft: OnboardingDraft): FieldValues {
  const values: FieldValues = { ...draft };
  for (const key of RADIO_NUMBER_FIELDS) {
    if (typeof values[key] === 'number') values[key] = String(values[key]);
  }
  return values;
}

export type CompletionMode = 'builtin' | 'ai';

export interface OnboardingWizardProps {
  today: string;
  draft: OnboardingDraft;
  step: OnboardingStep;
  /** Called with validated values whenever the user moves between steps. */
  onStepChange: (patch: OnboardingDraft, step: OnboardingStep) => void;
  onComplete: (answers: OnboardingAnswers, mode: CompletionMode) => void;
  aiEnabled: boolean;
  saving: boolean;
  /** Leave without saving; offered only when the user already has a plan. */
  onCancel?: () => void;
  /** The current plan's day 1, when retaking setup. */
  currentStartDate?: string;
}

/**
 * The first-run questionnaire: one validated form per step, with a progress
 * bar and Back / Continue. Each step's answers are handed to `onStepChange`
 * so the caller can persist them and resume after a reload.
 */
export function OnboardingWizard(props: OnboardingWizardProps) {
  // A fresh form per step, so each step gets its own schema and defaults.
  return <StepForm key={props.step} {...props} />;
}

function StepForm({
  today,
  draft,
  step,
  onStepChange,
  onComplete,
  aiEnabled,
  saving,
  onCancel,
  currentStartDate,
}: OnboardingWizardProps) {
  const { t } = useTranslation('onboarding');
  const index = ONBOARDING_STEPS.indexOf(step);
  const total = ONBOARDING_STEPS.length;
  const isLast = index === total - 1;
  const schema = schemaForStep(step, today);

  const recommendation = useMemo(() => {
    const ready = (['experience', 'health', 'lifestyle'] as const).every(
      (s) => schemaForStep(s, today).safeParse(draft).success,
    );
    return ready ? recommendLevel(draft as OnboardingAnswers) : null;
  }, [draft, today]);
  const recommended = recommendation?.level ?? 'intermediate';

  const form = useForm<FieldValues>({
    resolver: zodResolver(schema as never) as Resolver<FieldValues>,
    defaultValues: toFormValues(isLast && !draft.level ? { ...draft, level: recommended } : draft),
  });

  // Move focus to the step heading so screen readers announce the new step
  // (not on first load, where focus starts at the top of the page).
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (index > 0 || document.activeElement !== document.body) headingRef.current?.focus();
  }, [index]);

  const submit = (mode: CompletionMode) =>
    form.handleSubmit((values) => {
      const patch = values as OnboardingDraft;
      if (isLast) {
        onComplete({ ...draft, ...patch } as OnboardingAnswers, mode);
      } else {
        onStepChange(patch, ONBOARDING_STEPS[index + 1]);
      }
    });

  function goBack() {
    // Keep this step's answers if they're valid, so Back never loses finished work.
    const parsed = schema.safeParse(form.getValues());
    onStepChange(
      parsed.success ? (parsed.data as OnboardingDraft) : {},
      ONBOARDING_STEPS[index - 1],
    );
  }

  const stepKey = `steps.${step}` as const;
  const percent = Math.round(((index + 1) / total) * 100);

  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Dumbbell className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-h2 text-text">{t('brand')}</p>
            <p className="text-body-sm text-text-muted">{t('tagline')}</p>
          </div>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
              {t('cancel')}
            </Button>
          )}
        </header>

        <div>
          <div className="mb-2 flex justify-between text-caption text-text-muted">
            <span>{t('progress', { current: index + 1, total })}</span>
            <span aria-hidden="true">{percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={t('progressLabel')}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={index + 1}
            aria-valuetext={t('progress', { current: index + 1, total })}
            className="h-2 overflow-hidden rounded-full bg-card-2"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-base motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <Card>
          <FormProvider {...form}>
            <form
              noValidate
              onSubmit={submit('builtin')}
              aria-labelledby="onboarding-step-title"
              className="space-y-6"
            >
              <div>
                <h1
                  id="onboarding-step-title"
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-h1 text-text focus:outline-none"
                >
                  {t(`${stepKey}.title`)}
                </h1>
                <p className="mt-1 text-body-sm text-text-muted">{t(`${stepKey}.description`)}</p>
              </div>

              <div className="space-y-5">
                <StepFields
                  step={step}
                  today={today}
                  answers={draft}
                  recommended={recommended}
                  recommendReasons={recommendation?.reasons ?? []}
                  aiEnabled={aiEnabled}
                  onDesignWithAi={() => void submit('ai')()}
                  busy={saving}
                  currentStartDate={currentStartDate}
                />
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                {index > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={goBack}
                    disabled={saving}
                    leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                  >
                    {t('back')}
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  type="submit"
                  loading={saving}
                  rightIcon={
                    isLast ? undefined : <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  }
                >
                  {isLast ? t('plan.create') : t('next')}
                </Button>
              </div>
            </form>
          </FormProvider>
        </Card>
      </div>
    </main>
  );
}
