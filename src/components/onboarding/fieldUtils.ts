import { get, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

/** Id of the error message for `name`, for `aria-describedby`. */
export function errorId(name: string): string {
  return `${name.replace(/\./g, '-')}-error`;
}

/** The translated validation message for `name`, or null. */
export function useFieldError(name: string): string | null {
  const { t } = useTranslation('onboarding');
  const {
    formState: { errors },
  } = useFormContext();
  const message = get(errors, name)?.message as string | undefined;
  return message ? t(message) : null;
}

export const textareaClass = cn(
  'min-h-[72px] w-full rounded-md border border-border bg-card-2 px-3 py-2 text-body text-text placeholder:text-text-subtle',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
);
