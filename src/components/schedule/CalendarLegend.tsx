import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

const ITEMS: Array<{ key: string; swatch: string }> = [
  { key: 'done', swatch: 'border-success/40 bg-success-soft' },
  { key: 'planned', swatch: 'border-border bg-card' },
  { key: 'rest', swatch: 'border-border bg-card-2' },
  { key: 'missed', swatch: 'border-danger/40 bg-danger-soft' },
  { key: 'today', swatch: 'border-border bg-card ring-2 ring-accent' },
];

export function CalendarLegend() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-4 text-body-sm text-text-muted">
      {ITEMS.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-2">
          <span className={cn('h-3 w-3 rounded-sm border', item.swatch)} aria-hidden="true" />
          {t(`schedule.status.${item.key}`)}
        </span>
      ))}
    </div>
  );
}
