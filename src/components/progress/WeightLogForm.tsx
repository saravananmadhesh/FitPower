import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { weightFormSchema, type WeightFormValues } from '@/domain/formSchemas';
import { todayISO } from '@/domain/dates';

interface WeightLogFormProps {
  onSave: (values: WeightFormValues) => void;
}

export function WeightLogForm({ onSave }: WeightLogFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<WeightFormValues>({
    resolver: zodResolver(weightFormSchema),
    defaultValues: { date: todayISO(), kg: undefined },
  });

  function onSubmit(values: WeightFormValues) {
    onSave(values);
    // Only clear the weight — keep whatever date the user picked (matches
    // v1, which only cleared the weight input on save).
    resetField('kg');
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      noValidate
    >
      <div>
        <label htmlFor="weight-date" className="mb-1 block text-caption text-text-muted">
          {t('progress.weight.date')}
        </label>
        <Input
          id="weight-date"
          type="date"
          {...register('date')}
          aria-invalid={Boolean(errors.date)}
          aria-describedby={errors.date ? 'weight-date-error' : undefined}
        />
        {errors.date && (
          <p id="weight-date-error" className="mt-1 text-caption text-danger">
            {errors.date.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="weight-kg" className="mb-1 block text-caption text-text-muted">
          {t('progress.weight.kg')}
        </label>
        <Input
          id="weight-kg"
          type="number"
          step="0.1"
          placeholder={t('progress.weight.kgPlaceholder')}
          {...register('kg', { valueAsNumber: true })}
          aria-invalid={Boolean(errors.kg)}
          aria-describedby={errors.kg ? 'weight-kg-error' : undefined}
        />
        {errors.kg && (
          <p id="weight-kg-error" className="mt-1 text-caption text-danger">
            {errors.kg.message}
          </p>
        )}
      </div>
      <Button type="submit" loading={isSubmitting}>
        {t('progress.weight.save')}
      </Button>
    </form>
  );
}
