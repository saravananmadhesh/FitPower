import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { stepsFormSchema, type StepsFormValues } from '@/domain/formSchemas';

interface StepsFormProps {
  onSet: (steps: number) => void;
}

export function StepsForm({ onSet }: StepsFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StepsFormValues>({
    resolver: zodResolver(stepsFormSchema),
    defaultValues: { steps: undefined },
  });

  function onSubmit(values: StepsFormValues) {
    onSet(values.steps);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-2" noValidate>
      <div>
        <Input
          type="number"
          placeholder={t('nutrition.steps.placeholder')}
          className="w-36"
          aria-label={t('nutrition.steps.ariaLabel')}
          aria-invalid={Boolean(errors.steps)}
          {...register('steps', { valueAsNumber: true })}
        />
        {errors.steps && <p className="mt-1 text-caption text-danger">{errors.steps.message}</p>}
      </div>
      <Button type="submit" variant="secondary" size="sm">
        {t('nutrition.steps.set')}
      </Button>
    </form>
  );
}
