import { useTranslation } from 'react-i18next';
import { Ruler, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Measurement } from '@/types';

interface MeasurementHistoryTableProps {
  measurements: Measurement[];
  onDelete: (date: string) => void;
}

function formatCm(value: number | null): string {
  return value ? `${value} cm` : '—';
}

export function MeasurementHistoryTable({ measurements, onDelete }: MeasurementHistoryTableProps) {
  const { t } = useTranslation();
  if (measurements.length === 0) {
    return <EmptyState icon={Ruler} title={t('progress.measure.emptyTitle')} />;
  }

  const sorted = [...measurements].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-border text-left text-text-muted">
            <th className="py-2 pr-3 font-medium">{t('progress.measure.tableDate')}</th>
            <th className="py-2 pr-3 font-medium">{t('progress.measure.waist')}</th>
            <th className="py-2 pr-3 font-medium">{t('progress.measure.chest')}</th>
            <th className="py-2 pr-3 font-medium">{t('progress.measure.hip')}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr key={m.date} className="border-b border-border last:border-0">
              <td className="py-2 pr-3 text-text">{m.date}</td>
              <td className="tabular-nums py-2 pr-3 text-text">{formatCm(m.waist)}</td>
              <td className="tabular-nums py-2 pr-3 text-text">{formatCm(m.chest)}</td>
              <td className="tabular-nums py-2 pr-3 text-text">{formatCm(m.hip)}</td>
              <td className="py-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={t('progress.measure.delete', { date: m.date })}
                  onClick={() => onDelete(m.date)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
