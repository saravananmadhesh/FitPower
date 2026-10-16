import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

interface FavoriteButtonProps {
  name: string;
  pressed: boolean;
  onToggle: () => void;
  className?: string;
}

export function FavoriteButton({ name, pressed, onToggle, className }: FavoriteButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={t('gallery.favorites.toggle', { name })}
      onClick={onToggle}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-text transition-colors duration-base hover:border-border-strong',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
    >
      <Star className={cn('h-4 w-4', pressed && 'fill-accent')} aria-hidden="true" />
    </button>
  );
}
