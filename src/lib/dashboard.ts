import { format, subDays } from 'date-fns';
import { Completions, Habit } from '../types';
import { dateKey, dayKeyOffset } from './date';

export interface ActiveStreak {
  habit: Habit;
  current: number;
}

export interface StripDay {
  key: string;
  ratio: number;
  label: string;
  isToday: boolean;
}

export interface Insight {
  emoji: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function bestActiveStreak(
  habits: Habit[],
  streakOf: (id: string) => number
): ActiveStreak | null {
  let best: ActiveStreak | null = null;
  for (const h of habits) {
    const s = streakOf(h.id);
    if (s >= 3 && (!best || s > best.current)) best = { habit: h, current: s };
  }
  return best;
}

export function weekStrip(dayRatio: (d: string) => number): StripDay[] {
  const arr: StripDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    arr.push({
      key: dateKey(date),
      ratio: dayRatio(dateKey(date)),
      label: format(date, 'EEEEE'),
      isToday: i === 0,
    });
  }
  return arr;
}

interface Stats28Args {
  habits: Habit[];
  completions: Completions;
  dayRatio: (d: string) => number;
  consistency: (habitId: string, days: number) => number;
}

export function generateInsights({
  habits,
  completions,
  dayRatio,
  consistency,
}: Stats28Args): Insight[] {
  const insights: Insight[] = [];
  if (habits.length === 0) return insights;

  // 1) Best & worst weekday over last 28 days.
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 28; i++) {
    const d = subDays(new Date(), i);
    const wd = d.getDay();
    sums[wd] += dayRatio(dateKey(d));
    counts[wd]++;
  }
  const avgs = sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
  const max = Math.max(...avgs);
  const min = Math.min(...avgs);
  if (max - min > 0.15) {
    const bestIdx = avgs.indexOf(max);
    const worstIdx = avgs.indexOf(min);
    insights.push({
      emoji: '🌟',
      text: `${WEEKDAY_NAMES[bestIdx]}s are your best day (${Math.round(max * 100)}%).`,
      tone: 'good',
    });
    if (min < 0.5) {
      insights.push({
        emoji: '🌧️',
        text: `${WEEKDAY_NAMES[worstIdx]}s tend to slip (${Math.round(min * 100)}%) — plan ahead.`,
        tone: 'bad',
      });
    }
  }

  // 2) Most consistent & struggling habit (last 30 days).
  const ranked = habits
    .map((h) => ({ h, c: consistency(h.id, 30) }))
    .sort((a, b) => b.c - a.c);
  if (ranked.length > 0) {
    const top = ranked[0];
    if (top.c >= 0.7) {
      insights.push({
        emoji: '🏆',
        text: `${top.h.icon} ${top.h.name} is your strongest habit (${Math.round(top.c * 100)}%).`,
        tone: 'good',
      });
    }
    const bottom = ranked[ranked.length - 1];
    if (ranked.length > 1 && bottom.c < 0.4 && bottom.h.id !== top.h.id) {
      insights.push({
        emoji: '💪',
        text: `${bottom.h.icon} ${bottom.h.name} needs some love (${Math.round(bottom.c * 100)}%).`,
        tone: 'bad',
      });
    }
  }

  return insights.slice(0, 3);
}

export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 200, 365];

export function isMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak);
}
