import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Scale } from 'lucide-react';
import { rollingAvg } from '@/domain/metrics';
import { EmptyState } from '@/components/ui/EmptyState';
import type { WeightEntry } from '@/types';

interface WeightTrendChartProps {
  weights: WeightEntry[];
  goalKg: number;
}

export function WeightTrendChart({ weights, goalKg }: WeightTrendChartProps) {
  const { t } = useTranslation();
  const sorted = useMemo(
    () => [...weights].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [weights],
  );
  const avg = useMemo(() => rollingAvg(sorted), [sorted]);

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title={t('dashboard.weightChart.emptyTitle')}
        description={t('dashboard.weightChart.emptyDescription')}
      />
    );
  }

  const data = sorted.map((w, i) => ({
    date: w.date.slice(5),
    kg: w.kg,
    avg: avg[i],
    goal: goalKg,
  }));

  return (
    <div
      role="img"
      aria-label={t('dashboard.weightChart.ariaLabel', {
        latest: sorted[sorted.length - 1].kg,
        goal: goalKg,
      })}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="var(--color-text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--color-text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={['dataMin - 1', 'dataMax + 1']}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              fontSize: 13,
            }}
            labelStyle={{ color: 'var(--color-text)' }}
          />
          <Line
            type="monotone"
            dataKey="kg"
            name={t('dashboard.weightChart.daily')}
            stroke="var(--color-info)"
            strokeWidth={2}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="avg"
            name={t('dashboard.weightChart.avg7')}
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="goal"
            name={t('dashboard.weightChart.goal')}
            stroke="var(--color-success)"
            strokeDasharray="6 5"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
