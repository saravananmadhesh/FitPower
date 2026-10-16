import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  measurementFormSchema,
  type MeasurementFormInput,
  type MeasurementFormValues,
} from '@/domain/formSchemas';
import { todayISO } from '@/domain/dates';

interface MeasurementFormProps {
  onSave: (values: MeasurementFormValues) => void;
}

export function MeasurementForm({ onSave }: MeasurementFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<MeasurementFormInput, unknown, MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: { date: todayISO(), waist: undefined, chest: undefined, hip: undefined },
  });

  function onSubmit(values: MeasurementFormValues) {
    onSave(values);
    // Only clear the measurements — keep whatever date the user picked.
    resetField('waist');
    resetField('chest');
    resetField('hip');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="m-date" className="mb-1 block text-caption text-text-muted">
            {t('progress.measure.date')}
          </label>
          <Input id="m-date" type="date" {...register('date')} />
        </div>
        <div>
          <label htmlFor="m-waist" className="mb-1 block text-caption text-text-muted">
            {t('progress.measure.waist')}
          </label>
          <Input
            id="m-waist"
            type="number"
            step="0.1"
            placeholder={t('progress.measure.example', { value: 92 })}
            {...register('waist', { valueAsNumber: true })}
            aria-invalid={Boolean(errors.waist)}
            aria-describedby={errors.waist ? 'm-waist-error' : undefined}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="m-chest" className="mb-1 block text-caption text-text-muted">
            {t('progress.measure.chest')}
          </label>
          <Input
            id="m-chest"
            type="number"
            step="0.1"
            {...register('chest', { valueAsNumber: true })}
          />
        </div>
        <div>
          <label htmlFor="m-hip" className="mb-1 block text-caption text-text-muted">
            {t('progress.measure.hip')}
          </label>
          <Input
            id="m-hip"
            type="number"
            step="0.1"
            {...register('hip', { valueAsNumber: true })}
          />
        </div>
      </div>
      {errors.waist && (
        <p id="m-waist-error" className="text-caption text-danger">
          {errors.waist.message}
        </p>
      )}
      <Button type="submit" loading={isSubmitting}>
        {t('progress.measure.save')}
      </Button>
    </form>
  );
}
