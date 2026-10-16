import { useTranslation } from 'react-i18next';
import { addDays, formatISO, parseISO } from '@/domain/dates';
import { typeForDate } from '@/domain/program';
import { PROGRAM_DAYS } from '@/domain/constants';
import { cn } from '@/utils/cn';

interface CalendarGridProps {
  startDate: string;
  todayKey: string;
  done: Record<string, boolean>;
  onToggle: (dateKey: string) => void;
}

export function CalendarGrid({ startDate, todayKey, done, onToggle }: CalendarGridProps) {
  const { t } = useTranslation();
  const start = parseISO(startDate);
  const days = Array.from({ length: PROGRAM_DAYS }, (_, i) => {
    const d = addDays(start, i);
    const key = formatISO(d);
    const type = typeForDate(d);
    const isRest = type === 'R';
    const isToday = key === todayKey;
    const isPast = key < todayKey;
    const isDone = Boolean(done[key]);
    const isMissed = isPast && !isRest && !isDone;
    const isClickable = !isRest && (isPast || isToday);
    return { key, dayNum: i + 1, type, isRest, isToday, isDone, isMissed, isClickable };
  });

  return (
    <div
      className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-10"
      role="grid"
      aria-label={t('schedule.gridLabel')}
    >
      {days.map((day) => {
        const statusKey = day.isRest
          ? 'rest'
          : day.isDone
            ? 'done'
            : day.isMissed
              ? 'missed'
              : 'planned';
        return (
          <button
            key={day.key}
            type="button"
            disabled={!day.isClickable}
            onClick={() => onToggle(day.key)}
            aria-label={t('schedule.cellLabel', {
              day: day.dayNum,
              date: day.key,
              status: t(`schedule.status.${statusKey}`),
            })}
            className={cn(
              // Browser UA stylesheets color disabled buttons via `button:disabled`,
              // which outranks a plain `.text-*` class on specificity — pair every
              // status color with a matching `disabled:` variant so future (disabled)
              // cells keep their intended color instead of a uniform browser gray.
              'flex aspect-square flex-col items-center justify-center rounded-md border text-caption transition-colors duration-fast',
              day.isDone && 'border-success/40 bg-success-soft text-success disabled:text-success',
              day.isMissed && 'border-danger/40 bg-danger-soft text-danger disabled:text-danger',
              day.isRest &&
                !day.isDone &&
                'border-border bg-card-2 text-text-subtle disabled:text-text-subtle',
              !day.isRest &&
                !day.isDone &&
                !day.isMissed &&
                'border-border bg-card text-text disabled:text-text',
              day.isToday && 'ring-2 ring-accent',
              day.isClickable
                ? 'cursor-pointer hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
                : 'cursor-default',
            )}
          >
            <span className="font-semibold">{day.isRest ? 'R' : day.type}</span>
            <span className="text-[10px] text-text-subtle">{day.dayNum}</span>
          </button>
        );
      })}
    </div>
  );
}
