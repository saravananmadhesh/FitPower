import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { quickAddFormSchema, type QuickAddFormValues } from '@/domain/formSchemas';

interface QuickAddFormProps {
  ariaLabel: string;
  placeholder: string;
  buttonLabel: string;
  onAdd: (amount: number) => void;
}

export function QuickAddForm({ ariaLabel, placeholder, buttonLabel, onAdd }: QuickAddFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddFormSchema),
    defaultValues: { amount: undefined },
  });

  function onSubmit(values: QuickAddFormValues) {
    onAdd(values.amount);
    // Resetting to a partial ({ amount: undefined }) leaves the uncontrolled
    // number input's DOM value untouched — reset() with no args re-applies
    // the form's original defaultValues and actually clears it.
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-2" noValidate>
      <div>
        <Input
          type="number"
          placeholder={placeholder}
          className="w-28"
          aria-label={ariaLabel}
          aria-invalid={Boolean(errors.amount)}
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <p className="mt-1 text-caption text-danger">{errors.amount.message}</p>}
      </div>
      <Button type="submit" variant="secondary" size="sm">
        {buttonLabel}
      </Button>
    </form>
  );
}
