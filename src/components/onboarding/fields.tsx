import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { errorId, useFieldError } from './fieldUtils';

export function FieldError({ name }: { name: string }) {
  const error = useFieldError(name);
  if (!error) return null;
  return (
    <p id={errorId(name)} className="mt-1 text-caption text-danger" role="alert">
      {error}
    </p>
  );
}

interface FieldProps {
  name: string;
  label: string;
  hint?: ReactNode;
  optional?: boolean;
  /** Renders the control; receives the props that wire up label, hint and error. */
  children: (aria: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby'?: string;
  }) => ReactNode;
}

/** Label + control + hint + inline error, wired for screen readers. */
export function Field({ name, label, hint, optional, children }: FieldProps) {
  const { t } = useTranslation('onboarding');
  const error = useFieldError(name);
  const id = `field-${name.replace(/\./g, '-')}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, error ? errorId(name) : undefined].filter(Boolean).join(' ');
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-baseline gap-2 text-body-sm text-text">
        {label}
        {optional && <span className="text-caption text-text-subtle">{t('optional')}</span>}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <p id={hintId} className="mt-1 text-caption text-text-muted">
          {hint}
        </p>
      )}
      <FieldError name={name} />
    </div>
  );
}

export interface ChoiceOption {
  value: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

interface ChoiceGroupProps {
  name: string;
  legend: string;
  hint?: string;
  options: ChoiceOption[];
  /** `radio` picks one; `checkbox` registers an array of values. */
  type?: 'radio' | 'checkbox';
  /** Grid columns at the `sm` breakpoint and up. */
  columns?: 1 | 2 | 3 | 4 | 5;
  /** Compact single-line pills instead of cards (ratings, day counts). */
  compact?: boolean;
  legendClassName?: string;
}

const COLS = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
} as const;

/** A fieldset of native radios/checkboxes styled as selectable cards. */
export function ChoiceGroup({
  name,
  legend,
  hint,
  options,
  type = 'radio',
  columns = 2,
  compact = false,
  legendClassName,
}: ChoiceGroupProps) {
  const { register } = useFormContext();
  const error = useFieldError(name);
  const hintId = hint ? `${name}-hint` : undefined;
  const describedBy = [hintId, error ? errorId(name) : undefined].filter(Boolean).join(' ');
  return (
    <fieldset aria-describedby={describedBy || undefined} aria-invalid={Boolean(error)}>
      <legend className={cn('mb-2 text-body-sm text-text', legendClassName)}>{legend}</legend>
      {hint && (
        <p id={hintId} className="-mt-1 mb-2 text-caption text-text-muted">
          {hint}
        </p>
      )}
      <div className={cn('grid gap-2', compact ? 'grid-cols-5' : ['grid-cols-1', COLS[columns]])}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'relative flex cursor-pointer rounded-md border border-border bg-card-2 text-text transition-colors duration-base',
              'hover:border-border-strong',
              'has-[:checked]:border-accent has-[:checked]:bg-accent-soft',
              'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
              compact
                ? 'h-10 items-center justify-center whitespace-nowrap px-1 text-caption sm:text-body-sm'
                : 'items-start gap-3 p-3',
            )}
          >
            <input type={type} value={o.value} className="sr-only" {...register(name)} />
            {o.icon && <span className="mt-0.5 shrink-0 text-accent">{o.icon}</span>}
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'flex flex-wrap items-center gap-2 font-medium',
                  compact ? 'justify-center' : 'text-body',
                )}
              >
                {o.label}
                {o.badge}
              </span>
              {o.hint && !compact && (
                <span className="mt-0.5 block text-caption text-text-muted">{o.hint}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      <FieldError name={name} />
    </fieldset>
  );
}

interface CheckboxProps {
  name: string;
  label: string;
  className?: string;
}

/** A single boolean checkbox. */
export function Checkbox({ name, label, className }: CheckboxProps) {
  const { register } = useFormContext();
  const id = `field-${name.replace(/\./g, '-')}`;
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border-border accent-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        {...register(name)}
      />
      <label htmlFor={id} className="cursor-pointer text-body-sm text-text">
        {label}
      </label>
    </div>
  );
}
