import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's *default* palette/type-scale out of
 * the box — it has no visibility into tailwind.config.ts's custom tokens.
 * Without this, e.g. `text-accent-ink` (a color) and `text-body` (a custom
 * font-size) both start with `text-` and get misclassified into the same
 * conflict group; twMerge then keeps only the later class and silently
 * drops the color. That's exactly what caused primary buttons to render
 * near-white text on the lime background instead of the intended dark ink.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'bg',
        'surface',
        'card',
        'card-2',
        'border',
        'border-strong',
        'text',
        'text-muted',
        'text-subtle',
        'accent',
        'accent-ink',
        'accent-soft',
        'info',
        'info-soft',
        'teal',
        'teal-soft',
        'success',
        'success-soft',
        'warning',
        'warning-soft',
        'danger',
        'danger-soft',
      ],
    },
    classGroups: {
      'font-size': [
        'text-display',
        'text-h1',
        'text-h2',
        'text-h3',
        'text-body',
        'text-body-sm',
        'text-caption',
        'text-overline',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
