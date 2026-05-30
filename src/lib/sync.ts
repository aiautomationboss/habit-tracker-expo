import { supabase } from './supabase';
import { useHabits } from '../store/useHabits';
import { Challenge, Completions, DayNotes, Habit, Reflections } from '../types';

// ── Local <-> DB row mappers ───────────────────────────────────────────────

interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  type: 'daily' | 'quantity';
  target: number;
  color: string;
  icon: string;
  order: number;
  schedule: number[];
  reminder_hour: number | null;
  reminder_minute: number | null;
  created_at: string;
}

function habitToRow(h: Habit, userId: string): Omit<HabitRow, 'created_at'> {
  return {
    id: h.id,
    user_id: userId,
    name: h.name,
    type: h.type,
    target: h.target,
    color: h.color,
    icon: h.icon,
    order: h.order,
    schedule: h.schedule ?? [],
    reminder_hour: h.reminder?.hour ?? null,
    reminder_minute: h.reminder?.minute ?? null,
  };
}

function rowToHabit(r: HabitRow): Habit {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    target: r.target,
    color: r.color,
    icon: r.icon,
    order: r.order ?? 0,
    schedule: r.schedule ?? [],
    reminder:
      r.reminder_hour != null && r.reminder_minute != null
        ? { hour: r.reminder_hour, minute: r.reminder_minute }
        : null,
    createdAt: r.created_at,
  };
}

// ── Pull: server → local store ─────────────────────────────────────────────

export async function pullAllForUser(userId: string): Promise<void> {
  const [profileR, habitsR, completionsR, notesR, reflectionsR, challengeR] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('habits').select('*').eq('user_id', userId).order('order'),
    supabase.from('completions').select('habit_id, day_key, count').eq('user_id', userId),
    supabase.from('day_notes').select('day_key, note').eq('user_id', userId),
    supabase.from('reflections').select('*').eq('user_id', userId),
    supabase.from('challenges').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const habits: Habit[] = (habitsR.data ?? []).map((r) => rowToHabit(r as HabitRow));
  const completions: Completions = {};
  for (const c of (completionsR.data ?? []) as { habit_id: string; day_key: string; count: number }[]) {
    if (!completions[c.day_key]) completions[c.day_key] = {};
    completions[c.day_key][c.habit_id] = c.count;
  }
  const notes: DayNotes = {};
  for (const n of (notesR.data ?? []) as { day_key: string; note: string }[]) {
    if (n.note) notes[n.day_key] = n.note;
  }
  const reflections: Reflections = {};
  for (const r of (reflectionsR.data ?? []) as {
    week_key: string;
    worked: string;
    obstacles: string;
    intention: string;
    created_at: string;
  }[]) {
    reflections[r.week_key] = {
      worked: r.worked ?? '',
      obstacles: r.obstacles ?? '',
      intention: r.intention ?? '',
      createdAt: r.created_at,
    };
  }
  const challenge: Challenge | null = challengeR.data
    ? {
        id: challengeR.data.id,
        title: challengeR.data.title,
        habitIds: challengeR.data.habit_ids ?? [],
        durationDays: challengeR.data.duration_days,
        startDate: challengeR.data.start_date,
      }
    : null;

  const isEmpty =
    habits.length === 0 &&
    Object.keys(completions).length === 0 &&
    Object.keys(notes).length === 0 &&
    Object.keys(reflections).length === 0 &&
    !challenge;

  if (isEmpty) {
    // Server has nothing — push current local state instead (first-login case).
    return pushSnapshot(userId);
  }

  // Server has data — server wins.
  useHabits.setState({
    habits,
    completions,
    notes,
    reflections,
    challenge,
    onboarded: profileR.data?.onboarded ?? useHabits.getState().onboarded,
    theme: (profileR.data?.theme as 'dark' | 'light' | 'system') ?? useHabits.getState().theme,
    reminderEnabled: profileR.data?.reminder_enabled ?? useHabits.getState().reminderEnabled,
    reminderHour: profileR.data?.reminder_hour ?? useHabits.getState().reminderHour,
    reminderMinute: profileR.data?.reminder_minute ?? useHabits.getState().reminderMinute,
    soundsEnabled: profileR.data?.sounds_enabled ?? useHabits.getState().soundsEnabled,
  });
}

// ── Push: local store → server (full upsert) ───────────────────────────────

export async function pushSnapshot(userId: string): Promise<void> {
  const s = useHabits.getState();

  // 1. Profile / settings.
  await supabase.from('profiles').upsert(
    {
      id: userId,
      theme: s.theme,
      reminder_enabled: s.reminderEnabled,
      reminder_hour: s.reminderHour,
      reminder_minute: s.reminderMinute,
      sounds_enabled: s.soundsEnabled,
      onboarded: s.onboarded,
      last_opened_at: s.lastOpenedAt,
    },
    { onConflict: 'id' }
  );

  // 2. Habits — upsert all, then delete remote rows that no longer exist locally.
  if (s.habits.length > 0) {
    await supabase.from('habits').upsert(s.habits.map((h) => habitToRow(h, userId)), {
      onConflict: 'id',
    });
  }
  const localIds = s.habits.map((h) => h.id);
  if (localIds.length === 0) {
    await supabase.from('habits').delete().eq('user_id', userId);
  } else {
    await supabase.from('habits').delete().eq('user_id', userId).not('id', 'in', `(${localIds.map((i) => `"${i}"`).join(',')})`);
  }

  // 3. Completions.
  const completionRows: { user_id: string; habit_id: string; day_key: string; count: number }[] = [];
  for (const [day, byHabit] of Object.entries(s.completions)) {
    for (const [habitId, count] of Object.entries(byHabit)) {
      if (count > 0) completionRows.push({ user_id: userId, habit_id: habitId, day_key: day, count });
    }
  }
  if (completionRows.length > 0) {
    await supabase
      .from('completions')
      .upsert(completionRows, { onConflict: 'user_id,habit_id,day_key' });
  }

  // 4. Day notes.
  const noteRows = Object.entries(s.notes)
    .filter(([, note]) => note && note.length > 0)
    .map(([day_key, note]) => ({ user_id: userId, day_key, note }));
  if (noteRows.length > 0) {
    await supabase.from('day_notes').upsert(noteRows, { onConflict: 'user_id,day_key' });
  }

  // 5. Reflections.
  const reflectionRows = Object.entries(s.reflections).map(([week_key, r]) => ({
    user_id: userId,
    week_key,
    worked: r.worked,
    obstacles: r.obstacles,
    intention: r.intention,
  }));
  if (reflectionRows.length > 0) {
    await supabase
      .from('reflections')
      .upsert(reflectionRows, { onConflict: 'user_id,week_key' });
  }

  // 6. Challenge (single row per user).
  if (s.challenge) {
    await supabase.from('challenges').upsert(
      {
        id: s.challenge.id,
        user_id: userId,
        title: s.challenge.title,
        habit_ids: s.challenge.habitIds,
        duration_days: s.challenge.durationDays,
        start_date: s.challenge.startDate,
      },
      { onConflict: 'id' }
    );
  } else {
    await supabase.from('challenges').delete().eq('user_id', userId);
  }
}

// ── Subscription wiring ────────────────────────────────────────────────────

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
let currentUserId: string | null = null;

export async function startSync(userId: string): Promise<void> {
  currentUserId = userId;
  await pullAllForUser(userId);
  // Push current state on any future change, debounced.
  unsubscribe = useHabits.subscribe(() => scheduleDebouncedPush());
}

function scheduleDebouncedPush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    if (currentUserId) {
      pushSnapshot(currentUserId).catch(() => {
        // Best-effort; offline writes survive in AsyncStorage and re-sync on next change.
      });
    }
  }, 1500);
}

export function stopSync(): void {
  unsubscribe?.();
  unsubscribe = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  currentUserId = null;
}

export async function syncNow(): Promise<void> {
  if (currentUserId) await pushSnapshot(currentUserId);
}
