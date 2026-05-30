export type HabitType = 'daily' | 'quantity';

export interface Reminder {
  hour: number;
  minute: number;
}

export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  // For 'quantity' habits this is the per-day target (e.g. 8 glasses).
  // For 'daily' habits this is always 1.
  target: number;
  color: string;
  icon: string;
  createdAt: string;
  order: number;
  // Weekdays the habit is active: 0=Sun .. 6=Sat. Empty array means every day.
  schedule: number[];
  // Per-habit reminder time, or null for none.
  reminder: Reminder | null;
}

// Completions are stored as: dateKey -> habitId -> count done that day.
export type Completions = Record<string, Record<string, number>>;

// Free-text note per day.
export type DayNotes = Record<string, string>;

export interface Challenge {
  id: string;
  title: string;
  habitIds: string[];
  durationDays: number;
  startDate: string; // yyyy-MM-dd
}

export interface ChallengeStatus {
  active: boolean;
  daysCompleted: number;
  total: number;
  todayDone: boolean;
  finished: boolean;
}

export type ThemeName = 'dark' | 'light' | 'system';

export interface Reflection {
  worked: string;
  obstacles: string;
  intention: string;
  createdAt: string;
}

export type Reflections = Record<string, Reflection>;

export interface Snapshot {
  version: number;
  exportedAt: string;
  habits: Habit[];
  completions: Completions;
  notes: DayNotes;
  challenge: Challenge | null;
  theme: ThemeName;
  reflections?: Reflections;
}
