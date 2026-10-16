import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { formatScore } from '@/utils/gallery';

interface ScorePillProps {
  score: number;
  className?: string;
}

/**
 * Score /10, tinted by tier with tokens only: ≥8.5 accent, 7–8.4 neutral-strong,
 * <7 muted. The number always uses a text token so it stays AA in both themes.
 */
export function ScorePill({ score, className }: ScorePillProps) {
  const { t, i18n } = useTranslation();
  const value = formatScore(score, i18n.language);
  return (
    <span
      className={cn(
        'tabular-nums inline-flex shrink-0 items-baseline gap-0.5 rounded-full border px-2.5 py-0.5 text-body-sm font-semibold',
        score >= 8.5 && 'border-accent bg-accent-soft text-text',
        score >= 7 && score < 8.5 && 'border-border-strong bg-card-2 text-text',
        score < 7 && 'border-border bg-card-2 text-text-muted',
        className,
      )}
    >
      <span className="sr-only">{t('gallery.score.label', { score: value })}</span>
      <span aria-hidden="true">{value}</span>
      <span aria-hidden="true" className="text-caption font-medium">
        {t('gallery.score.outOf')}
      </span>
    </span>
  );
}
