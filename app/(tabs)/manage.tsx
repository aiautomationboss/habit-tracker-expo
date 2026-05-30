import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabits } from '../../src/store/useHabits';
import { syncNotifications } from '../../src/lib/notifications';
import { DraggableHabitList, ITEM_HEIGHT } from '../../src/components/DraggableHabitList';
import { useColors } from '../../src/lib/useColors';
import { Habit } from '../../src/types';
import { Palette, radius, spacing } from '../../src/theme';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function scheduleLabel(h: Habit): string {
  if (!h.schedule || h.schedule.length === 0 || h.schedule.length === 7) return 'Every day';
  return h.schedule
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LETTERS[d])
    .join(' ');
}

function timeLabel(h: Habit): string | null {
  if (!h.reminder) return null;
  const { hour, minute } = h.reminder;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const hr = hour % 12 === 0 ? 12 : hour % 12;
  return `⏰ ${hr}:${`${minute}`.padStart(2, '0')} ${ampm}`;
}

export default function ManageScreen() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const habits = useHabits((st) => st.habits);
  const removeHabit = useHabits((st) => st.removeHabit);
  const reorderHabits = useHabits((st) => st.reorderHabits);

  const ordered = useMemo(() => habits.slice().sort((a, b) => a.order - b.order), [habits]);

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete habit', `Remove "${name}" and its history?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeHabit(id);
          syncNotifications();
        },
      },
    ]);
  };

  const renderRow = (h: Habit) => (
    <View style={s.row}>
      <View style={s.handle}>
        <Text style={s.handleDots}>⠿</Text>
      </View>
      <View style={[s.iconWrap, { backgroundColor: h.color + '22' }]}>
        <Text style={s.icon}>{h.icon}</Text>
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>
          {h.name}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {h.type === 'daily' ? 'Once' : `${h.target}×`} · {scheduleLabel(h)}
          {timeLabel(h) ? ` · ${timeLabel(h)}` : ''}
        </Text>
      </View>
      <Pressable
        hitSlop={8}
        style={s.action}
        onPress={() => router.push({ pathname: '/habit-form', params: { id: h.id } })}
      >
        <Text style={s.actionText}>Edit</Text>
      </Pressable>
      <Pressable hitSlop={8} style={s.action} onPress={() => confirmDelete(h.id, h.name)}>
        <Text style={[s.actionText, { color: c.danger }]}>✕</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Habits</Text>
        <Pressable style={s.addBtn} onPress={() => router.push('/habit-form')}>
          <Text style={s.addBtnText}>+ New</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {ordered.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>🌱</Text>
            <Text style={s.emptyTitle}>No habits yet</Text>
            <Text style={s.empty}>One small habit beats an ambitious plan.</Text>
            <Pressable style={s.emptyCta} onPress={() => router.push('/habit-form')}>
              <Text style={s.emptyCtaText}>＋ Create your first habit</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <DraggableHabitList habits={ordered} onReorder={reorderHabits} renderRow={renderRow} />
            {ordered.length > 1 && (
              <Text style={s.tip}>Press & hold a habit, then drag to reorder.</Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    title: { color: c.text, fontSize: 30, fontWeight: '800' },
    addBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
    },
    addBtnText: { color: c.onPrimary, fontWeight: '800', fontSize: 15 },
    content: { padding: spacing.lg, paddingTop: spacing.sm },
    empty: { color: c.textDim, fontSize: 15, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
    emptyWrap: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
    emptyIcon: { fontSize: 56 },
    emptyTitle: { color: c.text, fontSize: 22, fontWeight: '800' },
    emptyCta: {
      backgroundColor: c.primary,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginTop: spacing.lg,
    },
    emptyCtaText: { color: c.onPrimary, fontSize: 15, fontWeight: '800' },
    row: {
      height: ITEM_HEIGHT - 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    handle: { width: 22, alignItems: 'center', justifyContent: 'center' },
    handleDots: { color: c.textDim, fontSize: 22, lineHeight: 24 },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: { fontSize: 20 },
    info: { flex: 1 },
    name: { color: c.text, fontSize: 16, fontWeight: '600' },
    meta: { color: c.textDim, fontSize: 12, marginTop: 2 },
    action: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    actionText: { color: c.primary, fontWeight: '700', fontSize: 14 },
    tip: { color: c.textDim, fontSize: 13, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
  });
