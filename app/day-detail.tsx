import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { isHabitDue, useHabits } from '../src/store/useHabits';
import { parseKey } from '../src/lib/date';
import { useColors } from '../src/lib/useColors';
import { Palette, radius, spacing } from '../src/theme';

export default function DayDetail() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const { day } = useLocalSearchParams<{ day: string }>();
  const dayKey = day ?? '';

  const habits = useHabits((st) => st.habits);
  const completions = useHabits((st) => st.completions);
  const notes = useHabits((st) => st.notes);
  const setCount = useHabits((st) => st.setCount);
  const setNote = useHabits((st) => st.setNote);

  const ordered = useMemo(() => habits.slice().sort((a, b) => a.order - b.order), [habits]);
  const dateObj = dayKey ? parseKey(dayKey) : new Date();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>{format(dateObj, 'EEE, MMM d')}</Text>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Text style={s.done}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {ordered.length === 0 && <Text style={s.empty}>No habits to show.</Text>}

        {ordered.map((h) => {
          const count = completions[dayKey]?.[h.id] ?? 0;
          const done = count >= h.target;
          const due = isHabitDue(h, dayKey);
          return (
            <View key={h.id} style={s.row}>
              <View style={[s.iconWrap, { backgroundColor: h.color + '22' }]}>
                <Text style={{ fontSize: 20 }}>{h.icon}</Text>
              </View>
              <View style={s.info}>
                <Text style={s.name}>{h.name}</Text>
                <Text style={s.meta}>
                  {due ? (h.type === 'daily' ? 'Scheduled' : `Target ${h.target}`) : 'Rest day'}
                </Text>
              </View>

              {h.type === 'quantity' ? (
                <View style={s.stepper}>
                  <Pressable
                    style={s.stepBtn}
                    onPress={() => setCount(h.id, dayKey, Math.max(0, count - 1))}
                  >
                    <Text style={s.stepText}>−</Text>
                  </Pressable>
                  <Text style={s.count}>
                    {count}/{h.target}
                  </Text>
                  <Pressable style={s.stepBtn} onPress={() => setCount(h.id, dayKey, count + 1)}>
                    <Text style={s.stepText}>+</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setCount(h.id, dayKey, done ? 0 : 1)}
                  style={[
                    s.check,
                    { borderColor: done ? h.color : c.border },
                    done && { backgroundColor: h.color },
                  ]}
                >
                  {done && <Text style={[s.checkMark, { color: c.onPrimary }]}>✓</Text>}
                </Pressable>
              )}
            </View>
          );
        })}

        <Text style={s.noteLabel}>Note</Text>
        <TextInput
          value={notes[dayKey] ?? ''}
          onChangeText={(t) => setNote(dayKey, t)}
          placeholder="How did the day go?"
          placeholderTextColor={c.textDim}
          style={s.note}
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
    title: { color: c.text, fontSize: 18, fontWeight: '800' },
    done: { color: c.primary, fontSize: 16, fontWeight: '700' },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    empty: { color: c.textDim, fontSize: 15, textAlign: 'center', marginTop: spacing.lg },
    row: {
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
    iconWrap: { width: 42, height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { color: c.text, fontSize: 16, fontWeight: '600' },
    meta: { color: c.textDim, fontSize: 13, marginTop: 2 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    stepBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepText: { color: c.text, fontSize: 20, marginTop: -2 },
    count: { color: c.text, fontSize: 15, fontWeight: '700', minWidth: 44, textAlign: 'center' },
    check: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkMark: { fontSize: 16, fontWeight: '900' },
    noteLabel: {
      color: c.textDim,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    note: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: spacing.md,
      color: c.text,
      fontSize: 15,
      minHeight: 90,
      textAlignVertical: 'top',
    },
  });
