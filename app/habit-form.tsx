import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabits } from '../src/store/useHabits';
import { HabitType } from '../src/types';
import { syncNotifications } from '../src/lib/notifications';
import { TimeField } from '../src/components/TimeField';
import { useColors } from '../src/lib/useColors';
import { Palette, habitColors, habitIcons, radius, spacing } from '../src/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function HabitForm() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useHabits((st) => st.habits.find((h) => h.id === id));
  const addHabit = useHabits((st) => st.addHabit);
  const editHabit = useHabits((st) => st.editHabit);

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<HabitType>(existing?.type ?? 'daily');
  const [target, setTarget] = useState(existing?.target ?? 3);
  const [color, setColor] = useState(existing?.color ?? habitColors[0]);
  const [icon, setIcon] = useState(existing?.icon ?? habitIcons[0]);
  const [schedule, setSchedule] = useState<number[]>(existing?.schedule ?? []);
  const [reminderOn, setReminderOn] = useState(!!existing?.reminder);
  const [rHour, setRHour] = useState(existing?.reminder?.hour ?? 9);
  const [rMinute, setRMinute] = useState(existing?.reminder?.minute ?? 0);

  const canSave = name.trim().length > 0;
  const everyDay = schedule.length === 0;

  const toggleDay = (d: number) =>
    setSchedule((prev) => {
      const next = prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d];
      return next.sort((a, b) => a - b);
    });

  const save = () => {
    if (!canSave) return;
    const payload = {
      name: name.trim(),
      type,
      target,
      color,
      icon,
      schedule,
      reminder: reminderOn ? { hour: rHour, minute: rMinute } : null,
    };
    if (existing) {
      editHabit(existing.id, payload);
    } else {
      addHabit(payload);
    }
    syncNotifications();
    router.back();
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Text style={s.cancel}>Cancel</Text>
        </Pressable>
        <Text style={s.title}>{existing ? 'Edit habit' : 'New habit'}</Text>
        <Pressable hitSlop={10} onPress={save} disabled={!canSave}>
          <Text style={[s.save, !canSave && s.saveDisabled]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.preview, { backgroundColor: color + '22' }]}>
          <Text style={{ fontSize: 40 }}>{icon}</Text>
        </View>

        <Text style={s.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Drink water"
          placeholderTextColor={c.textDim}
          style={s.input}
          autoFocus={!existing}
        />

        <Text style={s.label}>Type</Text>
        <View style={s.segment}>
          <Segment
            c={c}
            active={type === 'daily'}
            label="Once a day"
            sub="Check it off"
            onPress={() => setType('daily')}
          />
          <Segment
            c={c}
            active={type === 'quantity'}
            label="Multiple"
            sub="Count to a target"
            onPress={() => setType('quantity')}
          />
        </View>

        {type === 'quantity' && (
          <>
            <Text style={s.label}>Daily target</Text>
            <View style={s.stepper}>
              <Pressable style={s.stepBtn} onPress={() => setTarget((t) => Math.max(1, t - 1))}>
                <Text style={s.stepText}>−</Text>
              </Pressable>
              <Text style={s.stepValue}>{target}</Text>
              <Pressable style={s.stepBtn} onPress={() => setTarget((t) => Math.min(50, t + 1))}>
                <Text style={s.stepText}>+</Text>
              </Pressable>
            </View>
          </>
        )}

        <Text style={s.label}>Repeat</Text>
        <Pressable
          onPress={() => setSchedule([])}
          style={[s.repeatToggle, everyDay && { borderColor: c.primary, backgroundColor: c.surfaceAlt }]}
        >
          <Text style={[s.repeatToggleText, everyDay && { color: c.text }]}>Every day</Text>
        </Pressable>
        <View style={s.weekRow}>
          {WEEKDAYS.map((d, i) => {
            const on = schedule.includes(i);
            return (
              <Pressable
                key={i}
                onPress={() => toggleDay(i)}
                style={[s.weekDay, on && { borderColor: color, backgroundColor: color }]}
              >
                <Text style={[s.weekDayText, on && { color: c.onPrimary }]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
        {!everyDay && (
          <Text style={s.hint}>
            Only counts toward streaks on selected days — other days are rest days.
          </Text>
        )}

        <Text style={s.label}>Reminder</Text>
        <View style={s.reminderCard}>
          <View style={s.reminderHead}>
            <Text style={s.reminderLabel}>Remind me</Text>
            <Switch
              value={reminderOn}
              onValueChange={setReminderOn}
              trackColor={{ true: c.primary, false: c.border }}
              thumbColor={c.surface}
            />
          </View>
          {reminderOn && (
            <View style={s.timeWrap}>
              <TimeField
                hour={rHour}
                minute={rMinute}
                onChange={(h, m) => {
                  setRHour(h);
                  setRMinute(m);
                }}
              />
            </View>
          )}
        </View>

        <Text style={s.label}>Color</Text>
        <View style={s.swatchRow}>
          {habitColors.map((col) => (
            <Pressable
              key={col}
              onPress={() => setColor(col)}
              style={[s.swatch, { backgroundColor: col }, color === col && s.swatchActive]}
            />
          ))}
        </View>

        <Text style={s.label}>Icon</Text>
        <View style={s.iconGrid}>
          {habitIcons.map((ic) => (
            <Pressable
              key={ic}
              onPress={() => setIcon(ic)}
              style={[
                s.iconCell,
                icon === ic && { borderColor: color, backgroundColor: color + '22' },
              ]}
            >
              <Text style={{ fontSize: 22 }}>{ic}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Segment({
  c,
  active,
  label,
  sub,
  onPress,
}: {
  c: Palette;
  active: boolean;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: active ? c.surfaceAlt : c.surface,
        borderWidth: 1,
        borderColor: active ? c.primary : c.border,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <Text style={{ color: active ? c.text : c.textDim, fontSize: 15, fontWeight: '700' }}>
        {label}
      </Text>
      <Text style={{ color: c.textDim, fontSize: 12, marginTop: 2 }}>{sub}</Text>
    </Pressable>
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
    save: { color: c.primary, fontSize: 16, fontWeight: '700' },
    saveDisabled: { color: c.border },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    preview: {
      alignSelf: 'center',
      width: 84,
      height: 84,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    label: {
      color: c.textDim,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      color: c.text,
      fontSize: 16,
    },
    segment: { flexDirection: 'row', gap: spacing.sm },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    stepBtn: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepText: { color: c.text, fontSize: 24, marginTop: -2 },
    stepValue: { color: c.text, fontSize: 28, fontWeight: '800', minWidth: 40, textAlign: 'center' },
    hint: { color: c.textDim, fontSize: 13, marginTop: spacing.sm, lineHeight: 18 },
    repeatToggle: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    repeatToggleText: { color: c.textDim, fontSize: 15, fontWeight: '700' },
    weekRow: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'space-between' },
    weekDay: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekDayText: { color: c.textDim, fontSize: 15, fontWeight: '700' },
    reminderCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    reminderHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reminderLabel: { color: c.text, fontSize: 16, fontWeight: '600' },
    timeWrap: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border },
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    swatch: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 3, borderColor: 'transparent' },
    swatchActive: { borderColor: c.text },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    iconCell: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
