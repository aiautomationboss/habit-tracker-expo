import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NewHabitInput, useHabits } from '../src/store/useHabits';
import { useColors } from '../src/lib/useColors';
import { Palette, radius, spacing } from '../src/theme';

const SUGGESTIONS: NewHabitInput[] = [
  { name: 'Drink water', icon: '💧', color: '#4FD1C5', type: 'quantity', target: 8 },
  { name: 'Read', icon: '📚', color: '#6C8CFF', type: 'daily', target: 1 },
  { name: 'Exercise', icon: '💪', color: '#FF6B6B', type: 'daily', target: 1 },
  { name: 'Meditate', icon: '🧘', color: '#C792EA', type: 'daily', target: 1 },
  { name: 'Walk 10k steps', icon: '🏃', color: '#3DD68C', type: 'daily', target: 1 },
  { name: 'Sleep by 11pm', icon: '😴', color: '#FFB454', type: 'daily', target: 1 },
];

export default function Onboarding() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const habits = useHabits((st) => st.habits);
  const addHabit = useHabits((st) => st.addHabit);
  const removeHabit = useHabits((st) => st.removeHabit);
  const setOnboarded = useHabits((st) => st.setOnboarded);

  // Suggestions still available (not already added by name).
  const remaining = useMemo(
    () => SUGGESTIONS.filter((sg) => !habits.some((h) => h.name === sg.name)),
    [habits]
  );

  const finish = () => {
    setOnboarded(true);
    router.replace('/today');
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.kicker}>WELCOME</Text>
        <Text style={s.title}>Build habits that stick</Text>
        <Text style={s.sub}>Create your own habits, or quick-add a suggestion to get going.</Text>

        <View style={s.coachCard}>
          <Text style={s.coachTitle}>How habits stick</Text>
          <View style={s.coachRow}>
            <Text style={s.coachNum}>1</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.coachHead}>Pick small</Text>
              <Text style={s.coachBody}>One push-up beats zero. Start ridiculously easy.</Text>
            </View>
          </View>
          <View style={s.coachRow}>
            <Text style={s.coachNum}>2</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.coachHead}>Anchor to a routine</Text>
              <Text style={s.coachBody}>Tie a new habit to something you already do (coffee, brushing teeth).</Text>
            </View>
          </View>
          <View style={s.coachRow}>
            <Text style={s.coachNum}>3</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.coachHead}>Show up — even badly</Text>
              <Text style={s.coachBody}>Consistency beats intensity. A check today &gt; perfection next week.</Text>
            </View>
          </View>
        </View>

        <Pressable style={s.createBtn} onPress={() => router.push('/habit-form')}>
          <Text style={s.createPlus}>＋</Text>
          <View>
            <Text style={s.createTitle}>Create your own habit</Text>
            <Text style={s.createSub}>Name, schedule, reminder, color & icon</Text>
          </View>
        </Pressable>

        {remaining.length > 0 && (
          <>
            <Text style={s.section}>Quick add</Text>
            <View style={s.chipWrap}>
              {remaining.map((sg) => (
                <Pressable key={sg.name} style={s.chip} onPress={() => addHabit(sg)}>
                  <Text style={s.chipIcon}>{sg.icon}</Text>
                  <Text style={s.chipText}>{sg.name}</Text>
                  <Text style={[s.chipPlus, { color: sg.color }]}>＋</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={s.section}>
          {habits.length > 0 ? `Your habits (${habits.length})` : 'Your habits'}
        </Text>
        {habits.length === 0 ? (
          <Text style={s.emptyHint}>Nothing yet — create one above or tap a suggestion.</Text>
        ) : (
          habits.map((h) => (
            <View key={h.id} style={s.row}>
              <View style={[s.iconWrap, { backgroundColor: h.color + '22' }]}>
                <Text style={{ fontSize: 22 }}>{h.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{h.name}</Text>
                <Text style={s.meta}>
                  {h.type === 'daily' ? 'Once per day' : `${h.target}× per day`}
                </Text>
              </View>
              <Pressable hitSlop={8} onPress={() => removeHabit(h.id)}>
                <Text style={[s.remove, { color: c.danger }]}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <View style={s.footer}>
        <Pressable style={s.cta} onPress={finish}>
          <Text style={s.ctaText}>
            {habits.length > 0 ? 'Continue' : 'Skip for now'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    kicker: { color: c.primary, fontSize: 13, fontWeight: '800', letterSpacing: 1.5, marginTop: spacing.lg },
    title: { color: c.text, fontSize: 32, fontWeight: '800', marginTop: spacing.sm },
    sub: { color: c.textDim, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
    coachCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.lg,
      gap: spacing.md,
    },
    coachTitle: { color: c.text, fontSize: 16, fontWeight: '800' },
    coachRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    coachNum: {
      width: 28,
      height: 28,
      borderRadius: 14,
      textAlign: 'center',
      lineHeight: 28,
      color: c.onPrimary,
      backgroundColor: c.primary,
      fontWeight: '900',
      fontSize: 14,
      overflow: 'hidden',
    },
    coachHead: { color: c.text, fontSize: 14, fontWeight: '700' },
    coachBody: { color: c.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    createPlus: { color: c.primary, fontSize: 30, fontWeight: '300' },
    createTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
    createSub: { color: c.textDim, fontSize: 13, marginTop: 2 },
    section: {
      color: c.textDim,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    chipIcon: { fontSize: 16 },
    chipText: { color: c.text, fontSize: 14, fontWeight: '600' },
    chipPlus: { fontSize: 18, fontWeight: '700', marginLeft: 2 },
    emptyHint: { color: c.textDim, fontSize: 14, fontStyle: 'italic' },
    row: {
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
    iconWrap: { width: 46, height: 46, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    name: { color: c.text, fontSize: 16, fontWeight: '700' },
    meta: { color: c.textDim, fontSize: 13, marginTop: 2 },
    remove: { fontSize: 18, fontWeight: '800', paddingHorizontal: spacing.sm },
    footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: c.border },
    cta: { backgroundColor: c.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
    ctaText: { color: c.onPrimary, fontSize: 16, fontWeight: '800' },
  });
