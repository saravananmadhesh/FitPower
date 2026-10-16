import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import type { Rpe } from '@/types';

interface RpeRatingProps {
  value?: Rpe;
  onChange: (rpe: Rpe) => void;
}

const OPTIONS: Rpe[] = ['easy', 'right', 'hard'];

export function RpeRating({ value, onChange }: RpeRatingProps) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="mb-2 text-body-sm text-text-muted">{t('workout.rpe.prompt')}</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <Button
            key={opt}
            variant={value === opt ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onChange(opt)}
          >
            {t(`workout.rpe.options.${opt}`)}
          </Button>
        ))}
      </div>
      {value && <p className="mt-2 text-body-sm text-teal">{t(`workout.rpe.tips.${value}`)}</p>}
    </div>
  );
}
