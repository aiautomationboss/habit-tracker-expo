import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  differenceInCalendarDays,
  isAfter,
  max as dfMax,
  min as dfMin,
} from 'date-fns';
import { Completions, Habit } from '../types';
import { isHabitDue } from '../store/useHabits';
import { dateKey } from './date';

export interface Bucket {
  key: string;
  label: string;
  ratio: number;
}

export interface RangeStats {
  rate: number; // 0..1 completion rate across due habit-days
  perfectDays: number; // days where every due habit was done
  trackedDays: number; // days in range (up to today) that had any due habit
}

function clampEnd(end: Date): Date {
  const today = new Date();
  return isAfter(end, today) ? today : end;
}

export function rangeDayKeys(start: Date, end: Date): string[] {
  const realEnd = clampEnd(end);
  if (isAfter(start, realEnd)) return [];
  return eachDayOfInterval({ start, end: realEnd }).map((d) => dateKey(d));
}

export function rangeSpanLabel(start: Date, end: Date): string {
  const realEnd = clampEnd(end);
  if (isAfter(start, realEnd)) return '';
  const sameYear = start.getFullYear() === realEnd.getFullYear();
  const fmt = sameYear ? 'MMM d' : 'MMM d, yyyy';
  return `${format(start, fmt)} – ${format(realEnd, fmt)}`;
}

export function completionStats(
  habits: Habit[],
  completions: Completions,
  keys: string[]
): RangeStats {
  let due = 0;
  let done = 0;
  let perfectDays = 0;
  let trackedDays = 0;
  for (const k of keys) {
    let dayDue = 0;
    let dayDone = 0;
    for (const h of habits) {
      if (!isHabitDue(h, k)) continue;
      dayDue++;
      due++;
      if ((completions[k]?.[h.id] ?? 0) >= h.target) {
        dayDone++;
        done++;
      }
    }
    if (dayDue > 0) {
      trackedDays++;
      if (dayDone === dayDue) perfectDays++;
    }
  }
  return { rate: due === 0 ? 0 : done / due, perfectDays, trackedDays };
}

export function habitRate(habit: Habit, completions: Completions, keys: string[]): number {
  let due = 0;
  let done = 0;
  for (const k of keys) {
    if (!isHabitDue(habit, k)) continue;
    due++;
    if ((completions[k]?.[habit.id] ?? 0) >= habit.target) done++;
  }
  return due === 0 ? 0 : done / due;
}

// Splits the range into bars: daily (≤10d), weekly (≤45d), or monthly.
export function buildBuckets(
  habits: Habit[],
  completions: Completions,
  start: Date,
  end: Date
): Bucket[] {
  const realEnd = clampEnd(end);
  if (isAfter(start, realEnd)) return [];
  const span = differenceInCalendarDays(realEnd, start) + 1;
  const gran: 'day' | 'week' | 'month' = span <= 10 ? 'day' : span <= 45 ? 'week' : 'month';

  const heads =
    gran === 'day'
      ? eachDayOfInterval({ start, end: realEnd })
      : gran === 'week'
        ? eachWeekOfInterval({ start, end: realEnd }, { weekStartsOn: 1 })
        : eachMonthOfInterval({ start, end: realEnd });

  return heads.map((head) => {
    const bEnd =
      gran === 'day' ? head : gran === 'week' ? endOfWeek(head, { weekStartsOn: 1 }) : endOfMonth(head);
    const cs = dfMax([head, start]);
    const ce = dfMin([bEnd, realEnd]);
    const keys = eachDayOfInterval({ start: cs, end: ce }).map((d) => dateKey(d));
    const { rate } = completionStats(habits, completions, keys);
    const label =
      gran === 'day' ? format(head, 'EEEEE') : gran === 'week' ? format(head, 'd') : format(head, 'MMMMM');
    return { key: dateKey(head), label, ratio: rate };
  });
}
