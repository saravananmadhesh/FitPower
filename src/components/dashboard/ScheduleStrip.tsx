import { useTranslation } from 'react-i18next';
import { addDays, formatISO } from '@/domain/dates';
import { typeForDate } from '@/domain/program';
import { cn } from '@/utils/cn';

interface ScheduleStripProps {
  today: Date;
  todayKey: string;
  startDate: string;
  done: Record<string, boolean>;
}

export function ScheduleStrip({ today, todayKey, startDate, done }: ScheduleStripProps) {
  const { t } = useTranslation();
  const start = addDays(today, -3);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div
      className="flex justify-between gap-2"
      role="list"
      aria-label={t('dashboard.scheduleStrip.label')}
    >
      {days.map((d) => {
        const key = formatISO(d);
        const type = typeForDate(d);
        const isRest = type === 'R';
        const isToday = key === todayKey;
        const isBeforeStart = key < startDate;
        const isPast = key < todayKey;
        const isDone = Boolean(done[key]);
        const isMissed = isPast && !isRest && !isDone && !isBeforeStart;
        return (
          <div
            key={key}
            role="listitem"
            className={cn(
              'flex flex-1 flex-col items-center gap-1 rounded-md border px-2 py-2 text-center',
              isBeforeStart && 'border-border bg-card-2 opacity-50',
              !isBeforeStart && isDone && 'border-success/40 bg-success-soft',
              !isBeforeStart && isMissed && 'border-danger/40 bg-danger-soft',
              !isBeforeStart && isRest && !isDone && 'border-border bg-card-2',
              !isBeforeStart && !isRest && !isDone && !isMissed && 'border-border bg-card',
              isToday && 'ring-2 ring-accent',
            )}
          >
            <span className="text-caption text-text-muted">
              {d.toLocaleDateString(undefined, { weekday: 'short' })}
            </span>
            <span className="text-h3 text-text">{isRest ? 'R' : type}</span>
          </div>
        );
      })}
    </div>
  );
}
