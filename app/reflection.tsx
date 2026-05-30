import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useHabits } from '../src/store/useHabits';
import { completionStats, rangeDayKeys } from '../src/lib/stats';
import { dateKey } from '../src/lib/date';
import { useColors } from '../src/lib/useColors';
import { Palette, radius, spacing } from '../src/theme';

export default function ReflectionScreen() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const habits = useHabits((st) => st.habits);
  const completions = useHabits((st) => st.completions);
  const reflections = useHabits((st) => st.reflections);
  const setReflection = useHabits((st) => st.setReflection);
  const streak = useHabits((st) => st.streak);
  const bestStreak = useHabits((st) => st.bestStreak);

  const start = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const end = useMemo(() => endOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekKey = dateKey(start);
  const span = `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;

  const keys = useMemo(() => rangeDayKeys(start, end), [start, end, completions]);
  const stats = useMemo(() => completionStats(habits, completions, keys), [habits, completions, keys]);

  const existing = reflections[weekKey];
  const [worked, setWorked] = useState(existing?.worked ?? '');
  const [obstacles, setObstacles] = useState(existing?.obstacles ?? '');
  const [intention, setIntention] = useState(existing?.intention ?? '');

  const save = () => {
    setReflection(weekKey, { worked, obstacles, intention });
    router.back();
  };

  const ordered = useMemo(() => habits.slice().sort((a, b) => a.order - b.order), [habits]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Text style={s.cancel}>Cancel</Text>
        </Pressable>
        <Text style={s.title}>Weekly Reflection</Text>
        <Pressable hitSlop={10} onPress={save}>
          <Text style={s.saveBtn}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeIn.duration(280)} style={s.heroCard}>
          <Text style={s.span}>{span}</Text>
          <Text style={s.bigPct}>{Math.round(stats.rate * 100)}%</Text>
          <Text style={s.bigSub}>completion this week</Text>
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

        <Text style={s.section}>Streaks · current vs best</Text>
        {ordered.length === 0 && <Text style={s.empty}>Add habits to track streaks.</Text>}
        {ordered.map((h) => {
          const cur = streak(h.id);
          const best = bestStreak(h.id);
          const ratio = best === 0 ? 0 : Math.min(1, cur / best);
          return (
            <View key={h.id} style={s.streakCard}>
              <View style={[s.iconWrap, { backgroundColor: h.color + '22' }]}>
                <Text style={{ fontSize: 20 }}>{h.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.habitName}>{h.name}</Text>
                <View style={s.streakBarTrack}>
                  <View style={[s.streakBarFill, { width: `${ratio * 100}%`, backgroundColor: h.color }]} />
                </View>
              </View>
              <View style={s.streakNums}>
                <Text style={[s.streakCur, { color: c.warning }]}>🔥 {cur}</Text>
                <Text style={s.streakBest}>best {best}</Text>
              </View>
            </View>
          );
        })}

        <Text style={s.section}>What worked this week?</Text>
        <TextInput
          value={worked}
          onChangeText={setWorked}
          placeholder="The good — wins, surprises, what kept you going…"
          placeholderTextColor={c.textDim}
          style={s.input}
          multiline
        />

        <Text style={s.section}>What got in the way?</Text>
        <TextInput
          value={obstacles}
          onChangeText={setObstacles}
          placeholder="The honest part — what tripped you up?"
          placeholderTextColor={c.textDim}
          style={s.input}
          multiline
        />

        <Text style={s.section}>One intention for next week</Text>
        <TextInput
          value={intention}
          onChangeText={setIntention}
          placeholder="Just one. Make it specific."
          placeholderTextColor={c.textDim}
          style={s.input}
          multiline
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: { color: c.text, fontSize: 17, fontWeight: '700' },
    cancel: { color: c.textDim, fontSize: 16 },
    saveBtn: { color: c.primary, fontSize: 16, fontWeight: '700' },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      alignItems: 'center',
    },
    span: { color: c.textDim, fontSize: 13, fontWeight: '600' },
    bigPct: { color: c.text, fontSize: 56, fontWeight: '800', marginTop: spacing.xs },
    bigSub: { color: c.textDim, fontSize: 14, marginTop: -4 },
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
    section: {
      color: c.textDim,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    empty: { color: c.textDim, fontSize: 14 },
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    iconWrap: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    habitName: { color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
    streakBarTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
    streakBarFill: { height: '100%', borderRadius: 3 },
    streakNums: { alignItems: 'flex-end' },
    streakCur: { fontSize: 15, fontWeight: '800' },
    streakBest: { color: c.textDim, fontSize: 11, marginTop: 2 },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: spacing.md,
      color: c.text,
      fontSize: 15,
      minHeight: 80,
      textAlignVertical: 'top',
    },
  });
