import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
} from 'date-fns';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useHabits } from '../../src/store/useHabits';
import { Heatmap } from '../../src/components/Heatmap';
import { BarChart } from '../../src/components/BarChart';
import { generateInsights } from '../../src/lib/dashboard';
import {
  buildBuckets,
  completionStats,
  habitRate,
  rangeDayKeys,
  rangeSpanLabel,
} from '../../src/lib/stats';
import { useColors } from '../../src/lib/useColors';
import { Palette, radius, spacing } from '../../src/theme';

type RangeId = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last6' | 'thisYear';

const RANGES: { id: RangeId; label: string }[] = [
  { id: 'thisWeek', label: 'This Week' },
  { id: 'lastWeek', label: 'Last Week' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'last6', label: '6 Months' },
  { id: 'thisYear', label: 'This Year' },
];

function bounds(id: RangeId): { start: Date; end: Date } {
  const now = new Date();
  const wk = { weekStartsOn: 1 as const };
  switch (id) {
    case 'thisWeek':
      return { start: startOfWeek(now, wk), end: endOfWeek(now, wk) };
    case 'lastWeek': {
      const d = subWeeks(now, 1);
      return { start: startOfWeek(d, wk), end: endOfWeek(d, wk) };
    }
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'lastMonth': {
      const d = subMonths(now, 1);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    }
    case 'last6':
      return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    case 'thisYear':
      return { start: startOfYear(now), end: endOfYear(now) };
  }
}

export default function HistoryScreen() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const habits = useHabits((st) => st.habits);
  const completions = useHabits((st) => st.completions);
  const streak = useHabits((st) => st.streak);
  const bestStreak = useHabits((st) => st.bestStreak);
  const consistency = useHabits((st) => st.consistency);
  const dayRatio = useHabits((st) => st.dayRatio);

  const insights = useMemo(
    () => generateInsights({ habits, completions, dayRatio, consistency }),
    [habits, completions, dayRatio, consistency]
  );

  const [range, setRange] = useState<RangeId>('thisWeek');
  const [menuOpen, setMenuOpen] = useState(false);
  const { start, end } = useMemo(() => bounds(range), [range]);
  const activeLabel = RANGES.find((r) => r.id === range)!.label;

  const keys = useMemo(() => rangeDayKeys(start, end), [start, end, completions]);
  const stats = useMemo(
    () => completionStats(habits, completions, keys),
    [habits, completions, keys]
  );
  const buckets = useMemo(
    () => buildBuckets(habits, completions, start, end),
    [habits, completions, start, end]
  );
  const spanLabel = rangeSpanLabel(start, end);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.title}>History</Text>
          <Pressable style={s.dropdown} onPress={() => setMenuOpen(true)}>
            <Text style={s.dropdownText}>{activeLabel}</Text>
            <Text style={s.dropdownCaret}>▾</Text>
          </Pressable>
        </View>

        {/* Summary */}
        <Animated.View key={range} entering={FadeIn.duration(280)} style={s.summaryCard}>
          <View style={s.summaryHead}>
            <Text style={s.summaryLabel}>{spanLabel}</Text>
          </View>
          <Text style={s.summaryBig}>{Math.round(stats.rate * 100)}%</Text>
          <Text style={s.summaryCaption}>completion rate</Text>
          <View style={s.statRow}>
            <View style={s.statBox}>
              <Text style={[s.statNum, { color: c.success }]}>{stats.perfectDays}</Text>
              <Text style={s.statLabel}>Perfect days</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statNum, { color: c.text }]}>{stats.trackedDays}</Text>
              <Text style={s.statLabel}>Active days</Text>
            </View>
          </View>
        </Animated.View>

        {/* Insights */}
        {insights.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Insights</Text>
            <Text style={s.cardSub}>Patterns from the last 28 days</Text>
            <View style={{ gap: 8, marginTop: spacing.md }}>
              {insights.map((ins, i) => (
                <View key={i} style={s.insightRow}>
                  <Text style={s.insightEmoji}>{ins.emoji}</Text>
                  <Text
                    style={[
                      s.insightText,
                      ins.tone === 'good' && { color: c.success },
                      ins.tone === 'bad' && { color: c.warning },
                    ]}
                  >
                    {ins.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Trend */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Trend</Text>
          <Text style={s.cardSub}>Completion over {RANGES.find((r) => r.id === range)!.label.toLowerCase()}</Text>
          <Animated.View key={range} entering={FadeIn.duration(320)} style={{ marginTop: spacing.md }}>
            <BarChart buckets={buckets} />
          </Animated.View>
        </View>

        {/* Per-habit */}
        {habits.length === 0 && (
          <Text style={s.empty}>Add habits to start building your history.</Text>
        )}
        {habits.map((h) => {
          const cur = streak(h.id);
          const best = bestStreak(h.id);
          const rate = habitRate(h, completions, keys);
          return (
            <Animated.View key={h.id} layout={LinearTransition} style={s.card}>
              <View style={s.habitHead}>
                <View style={[s.iconWrap, { backgroundColor: h.color + '22' }]}>
                  <Text style={{ fontSize: 20 }}>{h.icon}</Text>
                </View>
                <Text style={s.habitName}>{h.name}</Text>
                <Text style={[s.habitRate, { color: h.color }]}>{Math.round(rate * 100)}%</Text>
              </View>
              <View style={[s.barTrack, { backgroundColor: c.surfaceAlt }]}>
                <View style={[s.barFill, { width: `${rate * 100}%`, backgroundColor: h.color }]} />
              </View>
              <View style={s.streakRow}>
                <Text style={s.streakItem}>🔥 {cur} current</Text>
                <Text style={s.streakItem}>🏅 {best} best</Text>
              </View>
            </Animated.View>
          );
        })}

        {/* Activity heatmap */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Recent activity</Text>
          <Text style={s.cardSub}>Last 13 weeks · tap a day to view or edit</Text>
          <View style={{ marginTop: spacing.md }}>
            <Heatmap />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={s.menu}>
            {RANGES.map((r) => {
              const on = r.id === range;
              return (
                <Pressable
                  key={r.id}
                  style={[s.menuItem, on && { backgroundColor: c.surfaceAlt }]}
                  onPress={() => {
                    setRange(r.id);
                    setMenuOpen(false);
                  }}
                >
                  <Text style={[s.menuText, on && { color: c.primary, fontWeight: '800' }]}>
                    {r.label}
                  </Text>
                  {on && <Text style={[s.menuCheck, { color: c.primary }]}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: { color: c.text, fontSize: 30, fontWeight: '800' },
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    dropdownText: { color: c.text, fontSize: 14, fontWeight: '700' },
    dropdownCaret: { color: c.textDim, fontSize: 12 },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 96,
      paddingRight: spacing.lg,
    },
    menu: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingVertical: spacing.xs,
      minWidth: 180,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    menuText: { color: c.text, fontSize: 15, fontWeight: '600' },
    menuCheck: { fontSize: 15, fontWeight: '800' },
    summaryCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      marginBottom: spacing.md,
      alignItems: 'center',
    },
    summaryHead: { alignItems: 'center' },
    summaryLabel: { color: c.textDim, fontSize: 13, fontWeight: '600' },
    summaryBig: { color: c.text, fontSize: 56, fontWeight: '800', marginTop: spacing.xs },
    summaryCaption: { color: c.textDim, fontSize: 14, marginTop: -4 },
    statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignSelf: 'stretch' },
    statBox: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
    },
    statNum: { fontSize: 22, fontWeight: '800' },
    statLabel: { color: c.textDim, fontSize: 12, marginTop: 2 },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    cardTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
    cardSub: { color: c.textDim, fontSize: 13, marginTop: 2 },
    empty: { color: c.textDim, fontSize: 15, textAlign: 'center', marginVertical: spacing.lg },
    habitHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    iconWrap: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    habitName: { color: c.text, fontSize: 16, fontWeight: '700', flex: 1 },
    habitRate: { fontSize: 16, fontWeight: '800' },
    barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    streakRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
    streakItem: { color: c.textDim, fontSize: 13, fontWeight: '600' },
    insightRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    insightEmoji: { fontSize: 18, lineHeight: 22 },
    insightText: { color: c.text, fontSize: 14, flex: 1, lineHeight: 20 },
  });
