import { useTranslation } from 'react-i18next';
import type { Difficulty } from '@/domain/catalog';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

const LEVEL: Record<Difficulty, number> = { beginner: 1, intermediate: 2, advanced: 3 };

/** Difficulty as 1–3 dots plus its label (the dots are decorative). */
export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { t } = useTranslation();
  return (
    <Badge className="gap-1.5">
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((dot) => (
          <span
            key={dot}
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              dot <= LEVEL[difficulty] ? 'bg-text' : 'bg-border-strong',
            )}
          />
        ))}
      </span>
      {t(`gallery.difficulty.${difficulty}`)}
    </Badge>
  );
}
