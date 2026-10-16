import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Activity, AlertTriangle, Dumbbell, Flame, HeartPulse, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DIFFICULTIES, EQUIPMENT } from '@/domain/constants';
import { GOAL_TYPES, INJURY_AREAS, INJURY_SIDES, SEXES, ageOn } from '@/domain/profile';
import {
  DAYS_PER_WEEK_OPTIONS,
  MINUTES_OPTIONS,
  PARQ_IDS,
  PLAN_LEVELS,
  needsDoctorNotice,
  planLengthDays,
  targetDateFor,
  type OnboardingAnswers,
  type OnboardingStep,
  type PlanLevel,
} from '@/domain/onboarding';
import { parseISO } from '@/domain/dates';
import { cn } from '@/utils/cn';
import { Checkbox, ChoiceGroup, Field } from './fields';
import { textareaClass } from './fieldUtils';

const GOAL_ICONS = {
  'fat-loss': <Flame className="h-5 w-5" aria-hidden="true" />,
  muscle: <Dumbbell className="h-5 w-5" aria-hidden="true" />,
  fitness: <Activity className="h-5 w-5" aria-hidden="true" />,
  maintain: <HeartPulse className="h-5 w-5" aria-hidden="true" />,
} as const;

/** Areas where "left / right / both" means something. */
const SIDED_AREAS = new Set(['knee', 'shoulder', 'wrist']);

export interface StepProps {
  today: string;
}

function AboutStep({ today }: StepProps) {
  const { t } = useTranslation('onboarding');
  const { register, control } = useFormContext();
  const birthDate = useWatch({ control, name: 'birthDate' }) as string | undefined;
  const validDate = birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && birthDate <= today;
  return (
    <>
      <Field name="name" label={t('about.name')} optional>
        {(aria) => (
          <Input
            {...aria}
            autoComplete="given-name"
            placeholder={t('about.namePlaceholder')}
            {...register('name')}
          />
        )}
      </Field>
      <Field
        name="birthDate"
        label={t('about.birthDate')}
        hint={validDate ? t('about.age', { count: ageOn(birthDate, today) }) : undefined}
      >
        {(aria) => (
          <Input {...aria} type="date" max={today} autoComplete="bday" {...register('birthDate')} />
        )}
      </Field>
      <ChoiceGroup
        name="sex"
        legend={t('about.sex')}
        hint={t('about.sexHint')}
        columns={3}
        options={SEXES.map((s) => ({ value: s, label: t(`about.sexOptions.${s}`) }))}
      />
    </>
  );
}

function BodyStep() {
  const { t } = useTranslation('onboarding');
  const { register, control } = useFormContext();
  const [height, weight, goal] = useWatch({
    control,
    name: ['heightCm', 'weightKg', 'goalWeightKg'],
  }) as [number | undefined, number | undefined, number | undefined];
  const bmi =
    height && weight && height >= 100 && weight >= 30
      ? (weight / (height / 100) ** 2).toFixed(1)
      : null;
  let change: string | null = null;
  if (weight && goal && weight >= 30 && goal >= 30) {
    const diff = Math.round((goal - weight) * 10) / 10;
    change =
      diff < 0
        ? t('body.change_lose', { kg: Math.abs(diff) })
        : diff > 0
          ? t('body.change_gain', { kg: diff })
          : t('body.change_same');
  }
  const numberProps = { type: 'number', inputMode: 'decimal' as const, step: '0.1' };
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field name="heightCm" label={t('body.height')}>
        {(aria) => (
          <Input {...aria} {...numberProps} {...register('heightCm', { valueAsNumber: true })} />
        )}
      </Field>
      <Field
        name="weightKg"
        label={t('body.weight')}
        hint={bmi ? t('body.bmi', { value: bmi }) : undefined}
      >
        {(aria) => (
          <Input {...aria} {...numberProps} {...register('weightKg', { valueAsNumber: true })} />
        )}
      </Field>
      <Field name="goalWeightKg" label={t('body.goalWeight')} hint={change ?? undefined}>
        {(aria) => (
          <Input
            {...aria}
            {...numberProps}
            {...register('goalWeightKg', { valueAsNumber: true })}
          />
        )}
      </Field>
    </div>
  );
}

const PRESET_DAYS = [84, 180, 365] as const;

function GoalStep({ today }: StepProps) {
  const { t } = useTranslation('onboarding');
  const { register, control, setValue } = useFormContext();
  const [start, target] = useWatch({ control, name: ['startDate', 'targetDate'] }) as [
    string | undefined,
    string | undefined,
  ];
  const isDate = (d?: string): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d));
  const days = isDate(start) && isDate(target) ? planLengthDays(start, target) : null;
  return (
    <>
      <ChoiceGroup
        name="goalType"
        legend={t('goal.goalType')}
        columns={2}
        options={GOAL_TYPES.map((g) => ({
          value: g,
          label: t(`goal.types.${g}.label`),
          hint: t(`goal.types.${g}.hint`),
          icon: GOAL_ICONS[g],
        }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="startDate" label={t('goal.startDate')} hint={t('goal.startHint')}>
          {(aria) => <Input {...aria} type="date" min={today} {...register('startDate')} />}
        </Field>
        <Field name="targetDate" label={t('goal.targetDate')} hint={t('goal.targetHint')}>
          {(aria) => <Input {...aria} type="date" min={start} {...register('targetDate')} />}
        </Field>
      </div>
      <div role="group" aria-label={t('goal.presets')} className="flex flex-wrap gap-2">
        {PRESET_DAYS.map((n) => (
          <Button
            key={n}
            type="button"
            variant="secondary"
            size="sm"
            aria-pressed={days === n}
            className={days === n ? 'border-accent bg-accent-soft' : undefined}
            disabled={!isDate(start)}
            onClick={() =>
              isDate(start) &&
              setValue('targetDate', targetDateFor(start, n), { shouldValidate: true })
            }
          >
            {t(`goal.preset.${n}`)}
          </Button>
        ))}
      </div>
      {days !== null && days > 0 && (
        <p className="text-body-sm text-text-muted" aria-live="polite">
          {t('goal.length', { days, weeks: Math.round(days / 7) })}
        </p>
      )}
    </>
  );
}

function ExperienceStep() {
  const { t } = useTranslation('onboarding');
  return (
    <ChoiceGroup
      name="experience"
      legend={t('steps.experience.title')}
      legendClassName="sr-only"
      columns={1}
      options={DIFFICULTIES.map((d) => ({
        value: d,
        label: t(`experience.levels.${d}.label`),
        hint: t(`experience.levels.${d}.hint`),
      }))}
    />
  );
}

function HealthStep() {
  const { t } = useTranslation('onboarding');
  const { register, control } = useFormContext();
  const injuries = useWatch({ control, name: 'injuries' }) as OnboardingAnswers['injuries'];
  const parq = useWatch({ control, name: 'parq' }) as OnboardingAnswers['parq'];
  const conditions = (useWatch({ control, name: 'conditions' }) as string | undefined) ?? '';
  const showDoctor = parq ? needsDoctorNotice({ parq, conditions }) : false;
  return (
    <>
      <fieldset>
        <legend className="mb-1 text-body-sm text-text">{t('health.injuries')}</legend>
        <p className="mb-2 text-caption text-text-muted">{t('health.injuriesHint')}</p>
        <div className="space-y-2">
          {INJURY_AREAS.map((area) => {
            const selected = injuries?.[area]?.selected;
            return (
              <div
                key={area}
                className="rounded-md border border-border bg-card-2 p-3 has-[:checked]:border-accent"
              >
                <Checkbox name={`injuries.${area}.selected`} label={t(`health.areas.${area}`)} />
                {selected && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
                    {SIDED_AREAS.has(area) && (
                      <Field name={`injuries.${area}.side`} label={t('health.side')}>
                        {(aria) => (
                          <Select {...aria} {...register(`injuries.${area}.side`)}>
                            {['', ...INJURY_SIDES].map((s) => (
                              <option key={s} value={s}>
                                {t(`health.sides.${s}`)}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                    )}
                    <Field name={`injuries.${area}.note`} label={t('health.note')} optional>
                      {(aria) => (
                        <Input
                          {...aria}
                          placeholder={t('health.notePlaceholder')}
                          {...register(`injuries.${area}.note`)}
                        />
                      )}
                    </Field>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-body-sm text-text">{t('health.parq')}</legend>
        <p className="mb-2 text-caption text-text-muted">{t('health.parqHint')}</p>
        <div className="space-y-3 rounded-md border border-border bg-card-2 p-3">
          {PARQ_IDS.map((id) => (
            <Checkbox key={id} name={`parq.${id}`} label={t(`health.parqQuestions.${id}`)} />
          ))}
        </div>
      </fieldset>

      <Field name="conditions" label={t('health.conditions')} optional>
        {(aria) => (
          <textarea
            {...aria}
            className={textareaClass}
            placeholder={t('health.conditionsPlaceholder')}
            {...register('conditions')}
          />
        )}
      </Field>

      {showDoctor && (
        <div
          role="status"
          className="flex gap-3 rounded-md border border-warning bg-warning-soft p-3 text-text"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="space-y-2">
            <p className="text-body font-medium">{t('health.doctorTitle')}</p>
            <p className="text-body-sm text-text">{t('health.doctorBody')}</p>
            <Checkbox name="clearedByDoctor" label={t('health.cleared')} />
          </div>
        </div>
      )}
    </>
  );
}

function RatingGroup({ name, legend }: { name: string; legend: string }) {
  const { t } = useTranslation('onboarding');
  return (
    <div>
      <ChoiceGroup
        name={name}
        legend={legend}
        compact
        options={[1, 2, 3, 4, 5].map((n) => ({
          value: String(n),
          label: String(n),
        }))}
      />
      <div className="mt-1 flex justify-between text-caption text-text-muted" aria-hidden="true">
        <span>{t('lifestyle.ratingLow')}</span>
        <span>{t('lifestyle.ratingHigh')}</span>
      </div>
    </div>
  );
}

function LifestyleStep() {
  const { t } = useTranslation('onboarding');
  return (
    <>
      <RatingGroup name="dietRating" legend={t('lifestyle.diet')} />
      <RatingGroup name="healthRating" legend={t('lifestyle.health')} />
      <ChoiceGroup
        name="daysPerWeek"
        legend={t('lifestyle.days')}
        compact
        options={DAYS_PER_WEEK_OPTIONS.map((n) => ({
          value: String(n),
          label: t('lifestyle.daysOption', { count: n }),
        }))}
      />
      <ChoiceGroup
        name="minutesPerSession"
        legend={t('lifestyle.minutes')}
        compact
        options={MINUTES_OPTIONS.map((n) => ({
          value: String(n),
          label: t('lifestyle.minutesOption', { count: n }),
        }))}
      />
      <ChoiceGroup
        name="equipment"
        type="checkbox"
        legend={t('lifestyle.equipment')}
        hint={t('lifestyle.equipmentHint')}
        columns={3}
        options={EQUIPMENT.map((e) => ({ value: e, label: t(`lifestyle.equipmentOptions.${e}`) }))}
      />
    </>
  );
}

interface PlanStepProps extends StepProps {
  answers: Partial<OnboardingAnswers>;
  recommended: PlanLevel;
  /** Why that level, as keys under `plans:recommend.reasons`. */
  recommendReasons: string[];
  aiEnabled: boolean;
  onDesignWithAi: () => void;
  busy: boolean;
  currentStartDate?: string;
}

function PlanStep({
  answers,
  recommended,
  recommendReasons,
  aiEnabled,
  onDesignWithAi,
  busy,
  currentStartDate,
}: PlanStepProps) {
  const { t, i18n } = useTranslation('onboarding');
  const a = answers as OnboardingAnswers;
  const injured = INJURY_AREAS.filter((area) => a.injuries?.[area]?.selected);
  const days = planLengthDays(a.startDate, a.targetDate);
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });
  const fmt = (d: string) => dateFormat.format(parseISO(d));
  return (
    <>
      <section aria-labelledby="plan-summary" className="rounded-md bg-card-2 p-3">
        <h2 id="plan-summary" className="mb-1 text-caption uppercase tracking-wide text-text-muted">
          {t('plan.summary')}
        </h2>
        <ul className="space-y-0.5 text-body-sm text-text">
          <li>
            {t('plan.summaryGoal', {
              goal: t(`goal.types.${a.goalType}.label`),
              days,
              start: fmt(a.startDate),
              end: fmt(a.targetDate),
            })}
          </li>
          <li>
            {t('plan.summaryBody', {
              height: a.heightCm,
              weight: a.weightKg,
              goalWeight: a.goalWeightKg,
            })}
          </li>
          <li>
            {t('plan.summaryTraining', {
              experience: t(`experience.levels.${a.experience}.label`),
              days: a.daysPerWeek,
              minutes: a.minutesPerSession,
            })}
          </li>
          {injured.length > 0 && (
            <li>
              {t('plan.summaryInjuries', {
                areas: injured.map((area) => t(`health.areas.${area}`)).join(', '),
              })}
            </li>
          )}
        </ul>
      </section>

      {currentStartDate && (
        <p
          role="status"
          className={cn(
            'rounded-md border p-3 text-body-sm text-text',
            currentStartDate === a.startDate ? 'border-border' : 'border-warning bg-warning-soft',
          )}
        >
          {currentStartDate === a.startDate
            ? t('plan.continueNotice', { date: fmt(currentStartDate) })
            : t('plan.restartNotice', { date: fmt(a.startDate) })}
        </p>
      )}

      <ChoiceGroup
        name="level"
        legend={t('plan.level')}
        columns={3}
        options={PLAN_LEVELS.map((l) => ({
          value: l,
          label: t(`plan.levels.${l}.label`),
          hint: t(`plan.levels.${l}.hint`),
          badge: l === recommended ? <Badge variant="accent">{t('plan.recommended')}</Badge> : null,
        }))}
      />

      {recommendReasons.length > 0 && (
        <p className="-mt-3 text-caption text-text-muted">
          {t('plans:recommend.why', {
            reasons: recommendReasons.map((r) => t(`plans:recommend.reasons.${r}`)).join(', '),
          })}
        </p>
      )}

      <div className="flex gap-3 rounded-md border border-border p-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div className="space-y-2">
          <p className="text-body font-medium text-text">
            {aiEnabled ? t('plan.aiTitle') : t('plan.aiOffTitle')}
          </p>
          <p className="text-body-sm text-text-muted">
            {aiEnabled ? t('plan.aiBody') : t('plan.aiOffBody')}
          </p>
          {aiEnabled && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onDesignWithAi}
              disabled={busy}
            >
              {t('plan.aiCta')}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export type StepRendererProps = StepProps &
  Omit<PlanStepProps, keyof StepProps> & { step: OnboardingStep };

/** The fields for one wizard step. */
export function StepFields({ step, ...props }: StepRendererProps) {
  switch (step) {
    case 'about':
      return <AboutStep today={props.today} />;
    case 'body':
      return <BodyStep />;
    case 'goal':
      return <GoalStep today={props.today} />;
    case 'experience':
      return <ExperienceStep />;
    case 'health':
      return <HealthStep />;
    case 'lifestyle':
      return <LifestyleStep />;
    case 'plan':
      return <PlanStep {...props} />;
  }
}
