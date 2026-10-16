import { useTranslation } from 'react-i18next';
import { Scale, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';
import type { WeightEntry } from '@/types';

interface WeightHistoryTableProps {
  weights: WeightEntry[];
  onDelete: (date: string) => void;
}

export function WeightHistoryTable({ weights, onDelete }: WeightHistoryTableProps) {
  const { t } = useTranslation();
  if (weights.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title={t('progress.weight.emptyTitle')}
        description={t('progress.weight.emptyDescription')}
      />
    );
  }

  const sorted = [...weights].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-border text-left text-text-muted">
            <th className="py-2 pr-3 font-medium">{t('progress.weight.tableDate')}</th>
            <th className="py-2 pr-3 font-medium">{t('progress.weight.tableWeight')}</th>
            <th className="py-2 pr-3 font-medium">{t('progress.weight.tableChange')}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((w, i) => {
            const prev = sorted[i + 1];
            const change = prev ? w.kg - prev.kg : 0;
            return (
              <tr key={w.date} className="border-b border-border last:border-0">
                <td className="py-2 pr-3 text-text">{w.date}</td>
                <td className="tabular-nums py-2 pr-3 text-text">{w.kg.toFixed(1)} kg</td>
                <td
                  className={cn(
                    'tabular-nums py-2 pr-3',
                    change < 0 ? 'text-success' : change > 0 ? 'text-danger' : 'text-text-muted',
                  )}
                >
                  {change ? `${change > 0 ? '+' : ''}${change.toFixed(1)}` : '—'}
                </td>
                <td className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={t('progress.weight.delete', { date: w.date })}
                    onClick={() => onDelete(w.date)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
