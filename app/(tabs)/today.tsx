import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { differenceInCalendarDays, format, startOfWeek } from 'date-fns';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { isHabitDue, useHabits } from '../../src/store/useHabits';
import { Habit } from '../../src/types';
import { HabitRow } from '../../src/components/HabitRow';
import { Confetti, ConfettiHandle } from '../../src/components/Confetti';
import { rewardAllDone, rewardComplete } from '../../src/lib/reward';
import { bestActiveStreak, isMilestone, weekStrip } from '../../src/lib/dashboard';
import { useColors } from '../../src/lib/useColors';
import { dateKey } from '../../src/lib/date';
import { Palette, radius, spacing } from '../../src/theme';

export default function TodayScreen() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const habits = useHabits((st) => st.habits);
  const completions = useHabits((st) => st.completions);
  const reflections = useHabits((st) => st.reflections);
  const isDone = useHabits((st) => st.isDone);
  const streakOf = useHabits((st) => st.streak);
  const dayRatio = useHabits((st) => st.dayRatio);
  const hydrated = useHabits((st) => st.hydrated);
  const challengeStatus = useHabits((st) => st.challengeStatus);
  const markOpened = useHabits((st) => st.markOpened);
  const resetProgress = useHabits((st) => st.resetProgress);
  const confetti = useRef<ConfettiHandle>(null);

  const hero = useMemo(() => bestActiveStreak(habits, streakOf), [habits, streakOf, completions]);
  const strip = useMemo(() => weekStrip(dayRatio), [dayRatio, completions]);

  // Snapshot lastOpenedAt at mount so the comeback card doesn't disappear
  // the instant we call markOpened().
  const [initialOpenedAt] = useState<string | null>(() => useHabits.getState().lastOpenedAt);
  const [comebackHidden, setComebackHidden] = useState(false);

  useEffect(() => {
    if (hydrated) markOpened();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const daysAway = initialOpenedAt
    ? differenceInCalendarDays(new Date(), new Date(initialOpenedAt))
    : 0;
  const showComeback = !comebackHidden && habits.length > 0 && daysAway >= 7;

  const todayDate = new Date();
  const isSunday = todayDate.getDay() === 0;
  const weekKey = dateKey(startOfWeek(todayDate, { weekStartsOn: 1 }));
  const hasReflection = !!reflections[weekKey];
  const showReflectionBanner = isSunday && !hasReflection && habits.length > 0 && !showComeback;

  const today = dateKey();
  const dueHabits = useMemo(
    () => habits.filter((h) => isHabitDue(h, today)).sort((a, b) => a.order - b.order),
    [habits, today]
  );

  const doneCount = dueHabits.filter((h) => isDone(h)).length;
  const total = dueHabits.length;
  const allDone = total > 0 && doneCount === total;
  const cs = challengeStatus();

  const handleComplete = (habit: Habit, x: number, y: number) => {
    const everyDone = dueHabits.every((h) => isDone(h));
    if (everyDone) {
      confetti.current?.fire(x, y, 2.2);
      rewardAllDone();
    } else {
      const streak = streakOf(habit.id);
      const milestone = streak > 0 && streak % 7 === 0;
      confetti.current?.fire(x, y, milestone ? 1.6 : 1);
      rewardComplete(milestone);
    }
    // Push the full-screen milestone moment after a beat.
    const finalStreak = useHabits.getState().streak(habit.id);
    if (isMilestone(finalStreak)) {
      setTimeout(() => {
        router.push({
          pathname: '/milestone',
          params: {
            streak: String(finalStreak),
            habitName: habit.name,
            habitIcon: habit.icon,
            color: habit.color,
          },
        });
      }, 600);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.dateLabel}>{format(new Date(), 'EEEE, MMM d')}</Text>
        <Text style={s.title}>Today</Text>

        {showComeback && (
          <Animated.View entering={FadeIn.duration(280)} style={s.comebackCard}>
            <Text style={s.comebackEmoji}>🌱</Text>
            <Text style={s.comebackTitle}>Welcome back</Text>
            <Text style={s.comebackSub}>
              You were away for {daysAway} days. No judgment — habits are hard. How do you want to restart?
            </Text>
            <View style={s.comebackRow}>
              <Pressable
                style={[s.comebackBtn, { backgroundColor: c.primary }]}
                onPress={() => setComebackHidden(true)}
              >
                <Text style={[s.comebackBtnText, { color: c.onPrimary }]}>Pick up where I left off</Text>
              </Pressable>
              <Pressable
                style={[s.comebackBtn, { backgroundColor: c.surfaceAlt }]}
                onPress={() => {
                  resetProgress();
                  setComebackHidden(true);
                }}
              >
                <Text style={[s.comebackBtnText, { color: c.text }]}>Start fresh</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {showReflectionBanner && (
          <Pressable style={s.reflectionBanner} onPress={() => router.push('/reflection')}>
            <Text style={s.reflectionEmoji}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.reflectionTitle}>Time for your weekly reflection</Text>
              <Text style={s.reflectionSub}>Tap to look back at the week</Text>
            </View>
            <Text style={s.reflectionChevron}>›</Text>
          </Pressable>
        )}

        {habits.length > 0 && (
          <Animated.View entering={FadeIn.duration(280)} style={s.heroCard}>
            {hero ? (
              <View style={s.heroStreak}>
                <Text style={s.heroFire}>🔥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.heroNum}>{hero.current}-day streak</Text>
                  <Text style={s.heroHabit}>
                    {hero.habit.icon} {hero.habit.name}
                  </Text>
                </View>
                <Text style={[s.heroBadge, { color: hero.habit.color }]}>on a roll</Text>
              </View>
            ) : (
              <View style={s.heroStreak}>
                <Text style={s.heroFire}>🌱</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.heroNum}>Build your first streak</Text>
                  <Text style={s.heroHabit}>Three days in a row unlocks a streak</Text>
                </View>
              </View>
            )}
            <View style={s.strip}>
              {strip.map((d) => {
                const color =
                  d.ratio >= 0.99
                    ? c.success
                    : d.ratio > 0
                      ? c.primary + 'AA'
                      : c.surfaceAlt;
                return (
                  <View key={d.key} style={s.stripCol}>
                    <View
                      style={[
                        s.stripDot,
                        { backgroundColor: color },
                        d.isToday && { borderWidth: 2, borderColor: c.text },
                      ]}
                    />
                    <Text
                      style={[
                        s.stripLabel,
                        d.isToday && { color: c.text, fontWeight: '800' },
                      ]}
                    >
                      {d.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {total > 0 && (
          <View style={s.summaryCard}>
            <View style={s.summaryTop}>
              <Text style={s.summaryText}>
                {allDone ? 'All done — nice work! 🎉' : `${doneCount} of ${total} done`}
              </Text>
              <Text style={s.summaryPct}>{Math.round((doneCount / total) * 100)}%</Text>
            </View>
            <View style={s.progressTrack}>
              <Animated.View
                layout={LinearTransition}
                style={[
                  s.progressFill,
                  {
                    width: `${(doneCount / total) * 100}%`,
                    backgroundColor: allDone ? c.success : c.primary,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {cs.active && !cs.finished && (
          <Pressable style={s.challengeBanner} onPress={() => router.push('/challenge')}>
            <Text style={s.challengeIcon}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.challengeTitle}>Challenge in progress</Text>
              <Text style={s.challengeSub}>
                {cs.daysCompleted} of {cs.total} days
                {cs.todayDone ? ' · today complete ✓' : ' · finish today’s habits'}
              </Text>
            </View>
            <Text style={s.challengeChevron}>›</Text>
          </Pressable>
        )}

        {hydrated && habits.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🌱</Text>
            <Text style={s.emptyTitle}>No habits yet</Text>
            <Text style={s.emptyText}>
              Pick one tiny thing you can do today. That's the whole trick.
            </Text>
            <Pressable style={s.emptyCta} onPress={() => router.push('/habit-form')}>
              <Text style={[s.emptyCtaText, { color: c.onPrimary }]}>＋ Create your first habit</Text>
            </Pressable>
          </View>
        )}

        {hydrated && habits.length > 0 && total === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🛌</Text>
            <Text style={s.emptyTitle}>Rest day</Text>
            <Text style={s.emptyText}>Nothing scheduled today. Rest counts too.</Text>
          </View>
        )}

        {dueHabits.map((h) => (
          <HabitRow key={h.id} habit={h} onComplete={handleComplete} />
        ))}

        <View style={{ height: Object.keys(completions).length === -1 ? 1 : 0 }} />
      </ScrollView>
      <Confetti ref={confetti} />
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    dateLabel: {
      color: c.textDim,
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: { color: c.text, fontSize: 34, fontWeight: '800', marginBottom: spacing.lg },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: spacing.md,
    },
    heroStreak: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    heroFire: { fontSize: 40 },
    heroNum: { color: c.text, fontSize: 20, fontWeight: '800' },
    heroHabit: { color: c.textDim, fontSize: 13, marginTop: 2 },
    heroBadge: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    strip: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
    stripCol: { flex: 1, alignItems: 'center', gap: 4 },
    stripDot: { width: 18, height: 18, borderRadius: 9 },
    stripLabel: { color: c.textDim, fontSize: 11, fontWeight: '600' },
    summaryCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    summaryTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    summaryText: { color: c.text, fontSize: 16, fontWeight: '700' },
    summaryPct: { color: c.textDim, fontSize: 16, fontWeight: '700' },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    challengeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.warning,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    comebackCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.primary,
      padding: spacing.lg,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    comebackEmoji: { fontSize: 40 },
    comebackTitle: { color: c.text, fontSize: 20, fontWeight: '800', marginTop: spacing.sm },
    comebackSub: {
      color: c.textDim,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    comebackRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, alignSelf: 'stretch' },
    comebackBtn: {
      flex: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    comebackBtnText: { fontSize: 14, fontWeight: '800' },
    reflectionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.primary,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    reflectionEmoji: { fontSize: 24 },
    reflectionTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
    reflectionSub: { color: c.textDim, fontSize: 13, marginTop: 2 },
    reflectionChevron: { color: c.textDim, fontSize: 28, fontWeight: '300' },
    challengeIcon: { fontSize: 26 },
    challengeTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
    challengeSub: { color: c.textDim, fontSize: 13, marginTop: 2 },
    challengeChevron: { color: c.textDim, fontSize: 28, fontWeight: '300' },
    empty: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.sm, paddingHorizontal: spacing.md },
    emptyIcon: { fontSize: 56 },
    emptyTitle: { color: c.text, fontSize: 22, fontWeight: '800' },
    emptyText: { color: c.textDim, fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
    emptyCta: {
      backgroundColor: c.primary,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginTop: spacing.lg,
    },
    emptyCtaText: { fontSize: 15, fontWeight: '800' },
  });
