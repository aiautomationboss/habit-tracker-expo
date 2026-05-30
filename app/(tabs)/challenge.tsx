import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabits } from '../../src/store/useHabits';
import { Confetti, ConfettiHandle } from '../../src/components/Confetti';
import { rewardAllDone } from '../../src/lib/reward';
import { addDayKey } from '../../src/lib/date';
import { useColors } from '../../src/lib/useColors';
import { Palette, radius, spacing } from '../../src/theme';

const DURATIONS = [
  { days: 3, label: '3 days', short: '3d' },
  { days: 7, label: '1 week', short: '1w' },
  { days: 30, label: '1 month', short: '1mo' },
  { days: 365, label: '1 year', short: '1yr' },
];

export default function ChallengeScreen() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const habits = useHabits((st) => st.habits);
  const challenge = useHabits((st) => st.challenge);
  const completions = useHabits((st) => st.completions);
  const status = useHabits((st) => st.challengeStatus);
  const startChallenge = useHabits((st) => st.startChallenge);
  const dismissChallenge = useHabits((st) => st.dismissChallenge);

  const [selected, setSelected] = useState<string[]>(habits.map((h) => h.id));
  const [duration, setDuration] = useState(7);
  const confetti = useRef<ConfettiHandle>(null);
  const celebrated = useRef(false);

  const cs = status();

  useEffect(() => {
    if (cs.finished && !celebrated.current) {
      celebrated.current = true;
      setTimeout(() => {
        confetti.current?.fire(200, 260, 2.4);
        rewardAllDone();
      }, 350);
    }
    if (!cs.finished) celebrated.current = false;
  }, [cs.finished]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ---- No active challenge: setup ----
  if (!challenge) {
    const durationLabel = DURATIONS.find((d) => d.days === duration)!.label;
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.title}>Challenge</Text>
          <View style={s.card}>
            <Text style={s.heroIcon}>🏆</Text>
            <Text style={s.heroTitle}>Start a challenge</Text>
            <Text style={s.heroSub}>
              Commit to your habits and finish all of them every day to win.
            </Text>
          </View>

          {habits.length === 0 ? (
            <Text style={s.empty}>Add some habits first, then start a challenge.</Text>
          ) : (
            <>
              <Text style={s.section}>Length</Text>
              <View style={s.durationRow}>
                {DURATIONS.map((d) => {
                  const on = d.days === duration;
                  return (
                    <Pressable
                      key={d.days}
                      onPress={() => setDuration(d.days)}
                      style={[s.durationPill, on && { borderColor: c.primary, backgroundColor: c.primary }]}
                    >
                      <Text style={[s.durationText, on && { color: c.onPrimary }]}>{d.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={s.section}>Pick habits</Text>
              {habits.map((h) => {
                const on = selected.includes(h.id);
                return (
                  <Pressable
                    key={h.id}
                    onPress={() => toggle(h.id)}
                    style={[s.pick, on && { borderColor: h.color, backgroundColor: h.color + '18' }]}
                  >
                    <View style={[s.iconWrap, { backgroundColor: h.color + '22' }]}>
                      <Text style={{ fontSize: 20 }}>{h.icon}</Text>
                    </View>
                    <Text style={s.pickName}>{h.name}</Text>
                    <View style={[s.dot, on && { backgroundColor: h.color, borderColor: h.color }]}>
                      {on && <Text style={[s.dotCheck, { color: c.onPrimary }]}>✓</Text>}
                    </View>
                  </Pressable>
                );
              })}

              <Pressable
                style={[s.cta, selected.length === 0 && { opacity: 0.4 }]}
                disabled={selected.length === 0}
                onPress={() =>
                  startChallenge({
                    title: `${durationLabel} Challenge`,
                    habitIds: selected,
                    durationDays: duration,
                  })
                }
              >
                <Text style={s.ctaText}>Start {durationLabel} challenge</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Active challenge ----
  const showCircles = challenge.durationDays <= 7;
  const days = showCircles
    ? Array.from({ length: challenge.durationDays }).map((_, i) => {
        const day = addDayKey(challenge.startDate, i);
        const allDone =
          challenge.habitIds.length > 0 &&
          challenge.habitIds.every((id) => {
            const h = habits.find((hh) => hh.id === id);
            return h ? (completions[day]?.[id] ?? 0) >= h.target : false;
          });
        return { day, allDone, index: i };
      })
    : [];

  const pct = cs.total > 0 ? cs.daysCompleted / cs.total : 0;
  const currentDay = Math.min(cs.daysCompleted + (cs.todayDone ? 0 : 1), cs.total);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Challenge</Text>

        <View style={s.card}>
          <Text style={s.heroIcon}>{cs.finished ? '🎉' : '🏆'}</Text>
          <Text style={s.heroTitle}>{cs.finished ? 'Challenge complete!' : challenge.title}</Text>
          <Text style={s.heroSub}>
            {cs.finished
              ? 'You showed up every day. That’s how habits stick.'
              : `${cs.daysCompleted} of ${cs.total} days complete`}
          </Text>

          {showCircles ? (
            <View style={s.dayRow}>
              {days.map((d) => (
                <View key={d.day} style={s.dayCol}>
                  <View
                    style={[
                      s.dayCircle,
                      d.allDone
                        ? { backgroundColor: c.success, borderColor: c.success }
                        : { borderColor: c.border },
                    ]}
                  >
                    <Text style={[s.dayNum, d.allDone && { color: c.onPrimary }]}>
                      {d.allDone ? '✓' : d.index + 1}
                    </Text>
                  </View>
                  <Text style={s.dayLabel}>Day {d.index + 1}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.progressWrap}>
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${pct * 100}%`, backgroundColor: cs.finished ? c.success : c.primary },
                  ]}
                />
              </View>
              <View style={s.progressMeta}>
                <Text style={s.progressMetaText}>
                  {cs.finished ? 'Done' : `Day ${currentDay}`}
                  {cs.todayDone && !cs.finished ? ' · today ✓' : ''}
                </Text>
                <Text style={s.progressPct}>{Math.round(pct * 100)}%</Text>
              </View>
            </View>
          )}
        </View>

        {cs.finished ? (
          <Pressable style={s.cta} onPress={() => dismissChallenge()}>
            <Text style={s.ctaText}>Start a new challenge</Text>
          </Pressable>
        ) : (
          <Pressable style={s.secondary} onPress={() => dismissChallenge()}>
            <Text style={[s.secondaryText, { color: c.danger }]}>Give up challenge</Text>
          </Pressable>
        )}
      </ScrollView>
      <Confetti ref={confetti} />
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    title: { color: c.text, fontSize: 30, fontWeight: '800', marginBottom: spacing.lg },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    heroIcon: { fontSize: 48, marginBottom: spacing.sm },
    heroTitle: { color: c.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
    heroSub: { color: c.textDim, fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
    empty: { color: c.textDim, fontSize: 15, textAlign: 'center', marginTop: spacing.lg },
    section: {
      color: c.textDim,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    durationPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    durationText: { color: c.textDim, fontSize: 14, fontWeight: '700' },
    dayRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, flexWrap: 'wrap', justifyContent: 'center' },
    dayCol: { alignItems: 'center', gap: 6 },
    dayCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNum: { color: c.textDim, fontSize: 16, fontWeight: '800' },
    dayLabel: { color: c.textDim, fontSize: 11 },
    progressWrap: { width: '100%', marginTop: spacing.lg },
    progressTrack: { height: 12, borderRadius: 6, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 6 },
    progressMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    progressMetaText: { color: c.text, fontSize: 15, fontWeight: '700' },
    progressPct: { color: c.textDim, fontSize: 15, fontWeight: '700' },
    pick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    iconWrap: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    pickName: { color: c.text, fontSize: 16, fontWeight: '600', flex: 1 },
    dot: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotCheck: { fontSize: 14, fontWeight: '900' },
    cta: {
      backgroundColor: c.primary,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    ctaText: { color: c.onPrimary, fontSize: 16, fontWeight: '800' },
    secondary: { padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
    secondaryText: { fontSize: 15, fontWeight: '600' },
  });
