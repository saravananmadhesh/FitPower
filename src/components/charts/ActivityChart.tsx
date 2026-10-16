import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ActivityChartProps {
  data: Array<{ label: string; value: number }>;
  target?: number;
  ariaLabel: string;
}

export function ActivityChart({ data, target, ariaLabel }: ActivityChartProps) {
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--color-text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              fontSize: 13,
            }}
          />
          {target !== undefined && (
            <ReferenceLine y={target} stroke="var(--color-warning)" strokeDasharray="5 4" />
          )}
          <Bar dataKey="value" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
