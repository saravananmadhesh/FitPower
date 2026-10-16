import { addDays, daysBetween, formatISO, parseISO } from './dates';
import { isTrainingDay, type TrainingPlan } from './plan';
import type { SetLog, WeightEntry } from '@/types';

/**
 * Consecutive completed workout-days ending at (or just before) today.
 * Rest days don't count either way; today not-yet-done doesn't break it.
 */
export function streakCount(
  plan: TrainingPlan,
  done: Record<string, boolean>,
  today: string,
): number {
  const start = parseISO(plan.startDate);
  const todayDate = parseISO(today);
  let streak = 0;
  for (let i = plan.totalDays - 1; i >= 0; i--) {
    const d = addDays(start, i);
    if (d > todayDate) continue;
    if (!isTrainingDay(plan, d)) continue;
    const key = formatISO(d);
    if (key === today && !done[key]) continue;
    if (done[key]) streak++;
    else break;
  }
  return streak;
}

export interface WeekStats {
  done: number;
  total: number;
}

/** Mon-Sun completion for the week containing `today`. */
export function weekStats(
  plan: TrainingPlan,
  today: string,
  done: Record<string, boolean>,
): WeekStats {
  const now = parseISO(today);
  const offset = (now.getDay() + 6) % 7; // days since Monday
  const monday = addDays(now, -offset);
  let doneCount = 0;
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    if (!isTrainingDay(plan, d)) continue;
    total++;
    if (done[formatISO(d)]) doneCount++;
  }
  return { done: doneCount, total };
}

/** Count of non-rest program days strictly before today that weren't completed. */
export function missedCount(
  plan: TrainingPlan,
  today: string,
  done: Record<string, boolean>,
): number {
  const start = parseISO(plan.startDate);
  let missed = 0;
  for (let i = 0; i < plan.totalDays; i++) {
    const d = addDays(start, i);
    const key = formatISO(d);
    if (key >= today) break;
    if (isTrainingDay(plan, d) && !done[key]) missed++;
  }
  return missed;
}

/** 7-day trailing average over LOGGED weight entries (not calendar days). */
export function rollingAvg(entries: WeightEntry[]): number[] {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return sorted.map((entry, i) => {
    const di = parseISO(entry.date).getTime();
    let sum = 0;
    let count = 0;
    for (let j = 0; j <= i; j++) {
      const dj = parseISO(sorted[j].date).getTime();
      if (di - dj <= 6 * 86_400_000) {
        sum += sorted[j].kg;
        count++;
      }
    }
    return Number((sum / count).toFixed(2));
  });
}

/** Most recent logged set for an exercise, excluding a given date (usually today). */
export function getLastSet(
  sets: Record<string, Record<string, SetLog>>,
  exerciseName: string,
  excludeDate: string,
): SetLog | null {
  const dates = Object.keys(sets).sort().reverse();
  for (const date of dates) {
    if (date === excludeDate) continue;
    const set = sets[date]?.[exerciseName];
    if (set) return set;
  }
  return null;
}

/** Weekly backup reminder: due once >=7 days since last backup, snoozable 3 days. */
export function backupDue(
  today: string,
  lastBackup: string | undefined,
  backupSnoozeUntil: string | undefined,
  hasData: boolean,
): boolean {
  if (backupSnoozeUntil && today < backupSnoozeUntil) return false;
  if (!lastBackup) return hasData;
  return daysBetween(lastBackup, today) >= 7;
}
