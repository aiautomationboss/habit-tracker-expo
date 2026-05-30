import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDay } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  Challenge,
  ChallengeStatus,
  Completions,
  DayNotes,
  Habit,
  HabitType,
  Reflection,
  Reflections,
  Reminder,
  Snapshot,
  ThemeName,
} from '../types';
import { addDayKey, dateKey, dayKeyOffset, parseKey } from '../lib/date';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface NewHabitInput {
  name: string;
  type: HabitType;
  target: number;
  color: string;
  icon: string;
  schedule?: number[];
  reminder?: Reminder | null;
}

// A habit is "due" on a given day if it has no schedule (every day) or the
// day's weekday is included in its schedule.
export function isHabitDue(habit: Habit, day: string): boolean {
  if (!habit.schedule || habit.schedule.length === 0) return true;
  return habit.schedule.includes(getDay(parseKey(day)));
}

interface HabitsState {
  habits: Habit[];
  completions: Completions;
  notes: DayNotes;
  reflections: Reflections;
  lastOpenedAt: string | null;
  hydrated: boolean;
  userId: string | null;
  onboarded: boolean;
  theme: ThemeName;
  challenge: Challenge | null;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  soundsEnabled: boolean;

  setUserId: (id: string | null) => void;
  setOnboarded: (v: boolean) => void;
  setTheme: (t: ThemeName) => void;
  setReminder: (cfg: Partial<{ enabled: boolean; hour: number; minute: number }>) => void;
  setSoundsEnabled: (v: boolean) => void;
  setReflection: (weekKey: string, patch: Partial<Reflection>) => void;
  markOpened: () => void;
  lastCompletionDay: (habitId: string) => string | null;
  daysSinceLast: (habitId: string) => number | null;
  resetProgress: () => void;

  addHabit: (input: NewHabitInput) => string;
  editHabit: (id: string, patch: Partial<NewHabitInput>) => void;
  removeHabit: (id: string) => void;
  reorderHabits: (orderedIds: string[]) => void;

  increment: (habitId: string) => number;
  decrement: (habitId: string) => number;
  setCount: (habitId: string, day: string, count: number) => void;
  setNote: (day: string, note: string) => void;

  countToday: (habitId: string) => number;
  isDone: (habit: Habit, day?: string) => boolean;
  dayRatio: (day: string) => number;
  streak: (habitId: string) => number;
  bestStreak: (habitId: string) => number;
  consistency: (habitId: string, days: number) => number;

  startChallenge: (input: { title: string; habitIds: string[]; durationDays: number }) => void;
  dismissChallenge: () => void;
  challengeStatus: () => ChallengeStatus;

  buildSnapshot: () => Snapshot;
  importSnapshot: (snap: Snapshot) => void;
  resetAll: () => void;
}

export const useHabits = create<HabitsState>()(
  persist(
    (set, get) => ({
      habits: [],
      completions: {},
      notes: {},
      reflections: {},
      lastOpenedAt: null,
      hydrated: false,
      userId: null,
      onboarded: false,
      theme: 'dark',
      challenge: null,
      reminderEnabled: false,
      reminderHour: 20,
      reminderMinute: 0,
      soundsEnabled: true,

      setUserId: (id) => set({ userId: id }),
      setOnboarded: (v) => set({ onboarded: v }),
      setTheme: (t) => set({ theme: t }),
      setSoundsEnabled: (v) => set({ soundsEnabled: v }),
      setReminder: (cfg) =>
        set((s) => ({
          reminderEnabled: cfg.enabled ?? s.reminderEnabled,
          reminderHour: cfg.hour ?? s.reminderHour,
          reminderMinute: cfg.minute ?? s.reminderMinute,
        })),

      setReflection: (weekKey, patch) =>
        set((s) => {
          const existing = s.reflections[weekKey];
          const next: Reflection = {
            worked: patch.worked ?? existing?.worked ?? '',
            obstacles: patch.obstacles ?? existing?.obstacles ?? '',
            intention: patch.intention ?? existing?.intention ?? '',
            createdAt: existing?.createdAt ?? new Date().toISOString(),
          };
          return { reflections: { ...s.reflections, [weekKey]: next } };
        }),

      markOpened: () => set({ lastOpenedAt: new Date().toISOString() }),

      lastCompletionDay: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return null;
        const { completions } = get();
        for (let offset = 0; offset < 365; offset++) {
          const key = dayKeyOffset(offset);
          if ((completions[key]?.[habitId] ?? 0) >= habit.target) return key;
        }
        return null;
      },

      daysSinceLast: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return null;
        const { completions } = get();
        for (let offset = 0; offset < 365; offset++) {
          const key = dayKeyOffset(offset);
          if ((completions[key]?.[habitId] ?? 0) >= habit.target) return offset;
        }
        return null;
      },

      resetProgress: () => set({ completions: {}, notes: {}, challenge: null }),

      addHabit: (input) => {
        const id = uid();
        set((s) => ({
          habits: [
            ...s.habits,
            {
              id,
              createdAt: new Date().toISOString(),
              name: input.name,
              type: input.type,
              color: input.color,
              icon: input.icon,
              target: input.type === 'daily' ? 1 : Math.max(1, input.target),
              order: s.habits.length,
              schedule: input.schedule ?? [],
              reminder: input.reminder ?? null,
            },
          ],
        }));
        return id;
      },

      editHabit: (id, patch) =>
        set((s) => ({
          habits: s.habits.map((h) =>
            h.id === id
              ? {
                  ...h,
                  ...patch,
                  target:
                    (patch.type ?? h.type) === 'daily'
                      ? 1
                      : Math.max(1, patch.target ?? h.target),
                  schedule: patch.schedule ?? h.schedule,
                  reminder: patch.reminder !== undefined ? patch.reminder : h.reminder,
                }
              : h
          ),
        })),

      removeHabit: (id) =>
        set((s) => {
          const completions: Completions = {};
          for (const [day, recs] of Object.entries(s.completions)) {
            const { [id]: _removed, ...rest } = recs;
            completions[day] = rest;
          }
          const challenge = s.challenge
            ? { ...s.challenge, habitIds: s.challenge.habitIds.filter((h) => h !== id) }
            : null;
          return { habits: s.habits.filter((h) => h.id !== id), completions, challenge };
        }),

      reorderHabits: (orderedIds) =>
        set((s) => ({
          habits: s.habits
            .map((h) => {
              const idx = orderedIds.indexOf(h.id);
              return { ...h, order: idx === -1 ? h.order : idx };
            })
            .sort((a, b) => a.order - b.order),
        })),

      increment: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return 0;
        const key = dateKey();
        const current = get().completions[key]?.[habitId] ?? 0;
        const next = Math.min(habit.target, current + 1);
        set((s) => ({
          completions: {
            ...s.completions,
            [key]: { ...(s.completions[key] ?? {}), [habitId]: next },
          },
        }));
        return next;
      },

      decrement: (habitId) => {
        const key = dateKey();
        const current = get().completions[key]?.[habitId] ?? 0;
        const next = Math.max(0, current - 1);
        set((s) => ({
          completions: {
            ...s.completions,
            [key]: { ...(s.completions[key] ?? {}), [habitId]: next },
          },
        }));
        return next;
      },

      setCount: (habitId, day, count) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return;
        const clamped = Math.max(0, Math.min(habit.target, count));
        set((s) => ({
          completions: {
            ...s.completions,
            [day]: { ...(s.completions[day] ?? {}), [habitId]: clamped },
          },
        }));
      },

      setNote: (day, note) =>
        set((s) => {
          const notes = { ...s.notes };
          if (note.trim().length === 0) delete notes[day];
          else notes[day] = note;
          return { notes };
        }),

      countToday: (habitId) => get().completions[dateKey()]?.[habitId] ?? 0,

      isDone: (habit, day = dateKey()) =>
        (get().completions[day]?.[habit.id] ?? 0) >= habit.target,

      dayRatio: (day) => {
        const { habits, completions } = get();
        const due = habits.filter((h) => isHabitDue(h, day));
        if (due.length === 0) return 0;
        const done = due.filter((h) => (completions[day]?.[h.id] ?? 0) >= h.target).length;
        return done / due.length;
      },

      streak: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return 0;
        const { completions } = get();
        let streak = 0;
        for (let offset = 0; offset < 3650; offset++) {
          const key = dayKeyOffset(offset);
          if (!isHabitDue(habit, key)) continue; // rest day — skip without breaking
          const done = (completions[key]?.[habitId] ?? 0) >= habit.target;
          if (done) streak++;
          else if (offset === 0) continue; // today not done yet
          else break;
        }
        return streak;
      },

      bestStreak: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return 0;
        const { completions } = get();
        let best = 0;
        let run = 0;
        for (let offset = 3650; offset >= 0; offset--) {
          const key = dayKeyOffset(offset);
          if (!isHabitDue(habit, key)) continue;
          const done = (completions[key]?.[habitId] ?? 0) >= habit.target;
          if (done) {
            run++;
            best = Math.max(best, run);
          } else {
            run = 0;
          }
        }
        return best;
      },

      consistency: (habitId, days) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return 0;
        const { completions } = get();
        let due = 0;
        let done = 0;
        for (let offset = 0; offset < days; offset++) {
          const key = dayKeyOffset(offset);
          if (!isHabitDue(habit, key)) continue;
          due++;
          if ((completions[key]?.[habitId] ?? 0) >= habit.target) done++;
        }
        return due === 0 ? 0 : done / due;
      },

      startChallenge: ({ title, habitIds, durationDays }) =>
        set({
          challenge: { id: uid(), title, habitIds, durationDays, startDate: dateKey() },
        }),

      dismissChallenge: () => set({ challenge: null }),

      challengeStatus: () => {
        const c = get().challenge;
        if (!c) {
          return { active: false, daysCompleted: 0, total: 0, todayDone: false, finished: false };
        }
        const { completions, habits } = get();
        const today = dateKey();
        let daysCompleted = 0;
        let todayDone = false;
        for (let i = 0; i < c.durationDays; i++) {
          const day = addDayKey(c.startDate, i);
          const allDone =
            c.habitIds.length > 0 &&
            c.habitIds.every((id) => {
              const h = habits.find((hh) => hh.id === id);
              return h ? (completions[day]?.[id] ?? 0) >= h.target : false;
            });
          if (allDone) daysCompleted++;
          if (day === today) todayDone = allDone;
        }
        return {
          active: true,
          daysCompleted,
          total: c.durationDays,
          todayDone,
          finished: daysCompleted >= c.durationDays,
        };
      },

      buildSnapshot: () => ({
        version: 1,
        exportedAt: new Date().toISOString(),
        habits: get().habits,
        completions: get().completions,
        notes: get().notes,
        challenge: get().challenge,
        theme: get().theme,
        reflections: get().reflections,
      }),

      importSnapshot: (snap) =>
        set({
          habits: Array.isArray(snap.habits) ? snap.habits : [],
          completions: snap.completions ?? {},
          notes: snap.notes ?? {},
          challenge: snap.challenge ?? null,
          theme: snap.theme ?? 'dark',
          reflections: snap.reflections ?? {},
        }),

      resetAll: () =>
        set({
          habits: [],
          completions: {},
          notes: {},
          reflections: {},
          challenge: null,
          onboarded: false,
          reminderEnabled: false,
          lastOpenedAt: null,
        }),
    }),
    {
      name: 'habit-tracker-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted: any, from: number) => {
        if (persisted && from < 2) {
          persisted.notes = persisted.notes ?? {};
          persisted.habits = (persisted.habits ?? []).map((h: any, i: number) => ({
            ...h,
            order: h.order ?? i,
            schedule: h.schedule ?? [],
            reminder: h.reminder ?? null,
          }));
        }
        return persisted;
      },
      partialize: (s) => ({
        habits: s.habits,
        completions: s.completions,
        notes: s.notes,
        reflections: s.reflections,
        lastOpenedAt: s.lastOpenedAt,
        onboarded: s.onboarded,
        theme: s.theme,
        challenge: s.challenge,
        reminderEnabled: s.reminderEnabled,
        reminderHour: s.reminderHour,
        reminderMinute: s.reminderMinute,
        soundsEnabled: s.soundsEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
