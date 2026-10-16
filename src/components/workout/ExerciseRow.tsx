import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Repeat } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { SetLog } from '@/types';

interface ExerciseRowProps {
  displayName: string;
  reps: string;
  hasAlternatives: boolean;
  onSwap: () => void;
  savedSet?: SetLog;
  lastSet: SetLog | null;
  onSaveSet: (set: SetLog) => void;
  howToHref: string;
  videoHref: string;
  /** Gallery detail route, when the exercise is in the catalog. */
  galleryTo?: string;
}

export function ExerciseRow({
  displayName,
  reps,
  hasAlternatives,
  onSwap,
  savedSet,
  lastSet,
  onSaveSet,
  howToHref,
  videoHref,
  galleryTo,
}: ExerciseRowProps) {
  const { t } = useTranslation();
  const [weight, setWeight] = useState(savedSet?.w ? String(savedSet.w) : '');
  const [repsDone, setRepsDone] = useState(savedSet?.reps ? String(savedSet.reps) : '');
  const [justSaved, setJustSaved] = useState(Boolean(savedSet));

  function handleSave() {
    const w = parseFloat(weight) || 0;
    const r = parseInt(repsDone, 10) || 0;
    if (!w && !r) return;
    onSaveSet({ w, reps: r });
    setJustSaved(true);
  }

  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-text">{displayName}</span>
        <span className="whitespace-nowrap text-body-sm text-text-muted">{reps}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-body-sm">
        <a
          href={howToHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {t('workout.exercise.howTo')}
        </a>
        <a
          href={videoHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {t('workout.exercise.video')}
        </a>
        {galleryTo && (
          <Link
            to={galleryTo}
            aria-label={t('workout.exercise.viewInGalleryLabel', { name: displayName })}
            className="text-accent hover:underline"
          >
            {t('workout.exercise.viewInGallery')}
          </Link>
        )}
        {hasAlternatives && (
          <button
            type="button"
            onClick={onSwap}
            className="flex items-center gap-1 text-warning hover:underline"
          >
            <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
            {t('workout.exercise.swap')}
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          placeholder={t('workout.exercise.kg')}
          value={weight}
          onChange={(e) => {
            setWeight(e.target.value);
            setJustSaved(false);
          }}
          className="w-20"
          aria-label={t('workout.exercise.weightLabel', { name: displayName })}
        />
        <Input
          type="number"
          inputMode="numeric"
          placeholder={t('workout.exercise.reps')}
          value={repsDone}
          onChange={(e) => {
            setRepsDone(e.target.value);
            setJustSaved(false);
          }}
          className="w-20"
          aria-label={t('workout.exercise.repsLabel', { name: displayName })}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSave}
          leftIcon={justSaved ? <Check className="h-4 w-4" aria-hidden="true" /> : undefined}
        >
          {justSaved ? t('workout.exercise.saved') : t('workout.exercise.log')}
        </Button>
        {lastSet && (
          <span className="text-caption text-text-subtle">
            {t('workout.exercise.lastHint', { w: lastSet.w, reps: lastSet.reps })}
          </span>
        )}
      </div>
    </li>
  );
}
