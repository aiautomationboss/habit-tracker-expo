import React, { useMemo, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Habit } from '../types';
import { useHabits } from '../store/useHabits';
import { rewardTick } from '../lib/reward';
import { syncNotifications } from '../lib/notifications';
import { useColors } from '../lib/useColors';
import { Palette, radius, spacing } from '../theme';
import { dateKey } from '../lib/date';

interface Props {
  habit: Habit;
  onComplete: (habit: Habit, x: number, y: number) => void;
}

export function HabitRow({ habit, onComplete }: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const count = useHabits((st) => st.completions[dateKey()]?.[habit.id] ?? 0);
  const increment = useHabits((st) => st.increment);
  const decrement = useHabits((st) => st.decrement);
  const setCount = useHabits((st) => st.setCount);
  const removeHabit = useHabits((st) => st.removeHabit);
  const streak = useHabits((st) => st.streak(habit.id));

  const done = count >= habit.target;
  const scale = useSharedValue(1);
  const containerRef = useRef<View>(null);
  const swipeRef = useRef<SwipeableMethods>(null);

  const fireFromCenter = () => {
    containerRef.current?.measureInWindow((x, y, w, h) => {
      onComplete(habit, x + w / 2, y + h / 2);
    });
  };

  const bump = () => {
    scale.value = withSequence(
      withTiming(1.04, { duration: 90 }),
      withSpring(1, { damping: 12 })
    );
  };

  const handlePress = () => {
    if (habit.type === 'daily') {
      if (done) {
        decrement(habit.id);
      } else {
        increment(habit.id);
        bump();
        fireFromCenter();
      }
      return;
    }
    if (done) return;
    const next = increment(habit.id);
    bump();
    if (next >= habit.target) fireFromCenter();
    else rewardTick();
  };

  const completeViaSwipe = () => {
    swipeRef.current?.close();
    if (done) return;
    setCount(habit.id, dateKey(), habit.target);
    bump();
    fireFromCenter();
  };

  // The check circle toggles the whole habit done/undone (works for any type).
  const toggleDone = () => {
    if (done) {
      setCount(habit.id, dateKey(), 0);
      bump();
    } else {
      setCount(habit.id, dateKey(), habit.target);
      bump();
      fireFromCenter();
    }
  };

  const deleteViaSwipe = () => {
    swipeRef.current?.close();
    Alert.alert('Delete habit', `Remove "${habit.name}" and its history?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeHabit(habit.id);
          syncNotifications();
        },
      },
    ]);
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const progress = habit.target > 1 ? count / habit.target : done ? 1 : 0;

  const renderLeft = () => (
    <View style={[s.action, { backgroundColor: c.success }]}>
      <Text style={s.actionText}>✓ Done</Text>
    </View>
  );
  const renderRight = () => (
    <View style={[s.action, s.actionRight, { backgroundColor: c.danger }]}>
      <Text style={s.actionText}>Delete</Text>
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      leftThreshold={64}
      rightThreshold={64}
      overshootFriction={8}
      renderLeftActions={done ? undefined : renderLeft}
      renderRightActions={renderRight}
      onSwipeableOpen={(dir) => {
        if (dir === 'left') completeViaSwipe();
        else deleteViaSwipe();
      }}
      containerStyle={s.swipeContainer}
    >
      <Animated.View ref={containerRef} style={animStyle}>
        <Pressable
          onPress={handlePress}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push({ pathname: '/habit-form', params: { id: habit.id } });
          }}
          delayLongPress={420}
          style={[
            s.row,
            { borderColor: done ? habit.color : c.border },
            done && { backgroundColor: habit.color + '22' },
          ]}
        >
          <View style={[s.iconWrap, { backgroundColor: habit.color + '22' }]}>
            <Text style={s.icon}>{habit.icon}</Text>
          </View>

          <View style={s.info}>
            <Text style={[s.name, done && s.nameDone]} numberOfLines={1}>
              {habit.name}
            </Text>
            <View style={s.metaRow}>
              {streak > 0 && <Text style={s.streak}>🔥 {streak}</Text>}
              {habit.type === 'quantity' && (
                <Text style={s.qty}>
                  {count} / {habit.target}
                </Text>
              )}
            </View>
            {habit.type === 'quantity' && (
              <View style={s.barTrack}>
                <View
                  style={[s.barFill, { width: `${progress * 100}%`, backgroundColor: habit.color }]}
                />
              </View>
            )}
          </View>

          {habit.type === 'quantity' && count > 0 && (
            <Pressable hitSlop={10} onPress={() => decrement(habit.id)} style={s.minus}>
              <Text style={s.minusText}>−</Text>
            </Pressable>
          )}

          <Pressable
            hitSlop={8}
            onPress={toggleDone}
            style={[
              s.check,
              { borderColor: done ? habit.color : c.border },
              done && { backgroundColor: habit.color },
            ]}
          >
            {done && <Text style={[s.checkMark, { color: c.onPrimary }]}>✓</Text>}
          </Pressable>
        </Pressable>
      </Animated.View>
    </ReanimatedSwipeable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    swipeContainer: { borderRadius: radius.md, marginBottom: spacing.sm },
    action: {
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      flex: 1,
    },
    actionRight: { alignItems: 'flex-end' },
    actionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.md,
      gap: spacing.md,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: { fontSize: 22 },
    info: { flex: 1, gap: 4 },
    name: { color: c.text, fontSize: 16, fontWeight: '600' },
    nameDone: { color: c.textDim, textDecorationLine: 'line-through' },
    metaRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    streak: { color: c.warning, fontSize: 13, fontWeight: '600' },
    qty: { color: c.textDim, fontSize: 13 },
    barTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: c.surfaceAlt,
      overflow: 'hidden',
      marginTop: 2,
    },
    barFill: { height: '100%', borderRadius: 3 },
    minus: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    minusText: { color: c.text, fontSize: 20, marginTop: -2 },
    check: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkMark: { fontSize: 16, fontWeight: '900' },
  });
