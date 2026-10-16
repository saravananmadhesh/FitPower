import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: { label: string; direction: 'up' | 'down' | 'neutral' };
  highlight?: boolean;
}

export function StatCard({ icon: Icon, label, value, delta, highlight }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md',
            highlight ? 'bg-accent-soft text-accent' : 'bg-card-2 text-text-muted',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {delta && (
          <Badge
            variant={
              delta.direction === 'down'
                ? 'success'
                : delta.direction === 'up'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {delta.label}
          </Badge>
        )}
      </div>
      <div>
        <div className="tabular-nums text-display text-text">{value}</div>
        <div className="text-body-sm text-text-muted">{label}</div>
      </div>
    </Card>
  );
}
