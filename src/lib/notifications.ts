import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useHabits } from '../store/useHabits';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL = 'reminders';

export async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

async function scheduleDaily(title: string, body: string, hour: number, minute: number) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL,
    },
  });
}

async function scheduleWeekly(
  title: string,
  body: string,
  weekday0: number, // 0=Sun .. 6=Sat
  hour: number,
  minute: number
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: weekday0 + 1, // expo: 1=Sunday .. 7=Saturday
      hour,
      minute,
      channelId: CHANNEL,
    },
  });
}

async function scheduleOneShot(title: string, body: string, date: Date) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: date.getTime(),
      channelId: CHANNEL,
    },
  });
}

function nextAt(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

// Re-schedules ALL notifications from current store state.
export async function syncNotifications(): Promise<boolean> {
  const ok = await ensurePermissions();
  if (!ok) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const s = useHabits.getState();

  // 1) Configurable global daily reminder.
  if (s.reminderEnabled) {
    await scheduleDaily(
      'Habit check-in',
      "Time to knock out today's habits 💪",
      s.reminderHour,
      s.reminderMinute
    );
  }

  // 2) Per-habit reminders on scheduled weekdays.
  for (const h of s.habits) {
    if (!h.reminder) continue;
    const days = h.schedule.length ? h.schedule : [0, 1, 2, 3, 4, 5, 6];
    for (const d of days) {
      await scheduleWeekly(
        `${h.icon} ${h.name}`,
        'Time for your habit — keep the streak alive.',
        d,
        h.reminder.hour,
        h.reminder.minute
      );
    }
  }

  // 3) Streak-at-risk: 8 PM if anything has a real streak (≥ 3 days).
  const hasStreak = s.habits.some((h) => s.streak(h.id) >= 3);
  if (hasStreak) {
    await scheduleDaily(
      'Streaks at risk 🔥',
      'Check your habits before bed — protect what you’ve built.',
      20,
      0
    );
  }

  // 4) Weekly reflection: Sunday 8 PM.
  await scheduleWeekly(
    'Sunday reflection ✨',
    'How was your week? Tap to reflect.',
    0,
    20,
    0
  );

  // 5) Lapse nudge: one-shot tomorrow 9 AM if any habit's been silent 3+ days.
  const now = Date.now();
  const THREE_DAYS = 3 * 86400000;
  const lapsed = s.habits.filter((h) => {
    const d = s.daysSinceLast(h.id);
    if (d == null) {
      return now - new Date(h.createdAt).getTime() > THREE_DAYS;
    }
    return d >= 3;
  });
  if (lapsed.length > 0) {
    const names = lapsed.slice(0, 3).map((h) => `${h.icon} ${h.name}`).join(', ');
    const more = lapsed.length > 3 ? ` (+${lapsed.length - 3} more)` : '';
    await scheduleOneShot(
      'Still building habits?',
      `Haven’t seen ${names}${more} in a few days. No judgment — just checking in.`,
      nextAt(9, 0)
    );
  }

  return true;
}

export async function disableAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
