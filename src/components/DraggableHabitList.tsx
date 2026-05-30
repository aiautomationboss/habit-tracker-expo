import { ReactNode, useEffect } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Habit } from '../types';

export const ITEM_HEIGHT = 84;

type PosMap = Record<string, number>;

function clamp(v: number, lower: number, upper: number) {
  'worklet';
  return Math.max(lower, Math.min(v, upper));
}

function objectMove(obj: PosMap, from: number, to: number): PosMap {
  'worklet';
  const next: PosMap = { ...obj };
  for (const id in obj) {
    if (obj[id] === from) next[id] = to;
    if (obj[id] === to) next[id] = from;
  }
  return next;
}

interface Props {
  habits: Habit[];
  onReorder: (orderedIds: string[]) => void;
  renderRow: (habit: Habit) => ReactNode;
}

export function DraggableHabitList({ habits, onReorder, renderRow }: Props) {
  const positions = useSharedValue<PosMap>(
    Object.fromEntries(habits.map((h, i) => [h.id, i]))
  );

  const idsKey = habits.map((h) => h.id).join(',');
  useEffect(() => {
    positions.value = Object.fromEntries(habits.map((h, i) => [h.id, i]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const commit = (map: PosMap) => {
    const ids = Object.keys(map).sort((a, b) => map[a] - map[b]);
    onReorder(ids);
  };

  return (
    <View style={{ height: habits.length * ITEM_HEIGHT }}>
      {habits.map((h) => (
        <DraggableItem
          key={h.id}
          id={h.id}
          positions={positions}
          count={habits.length}
          onCommit={commit}
        >
          {renderRow(h)}
        </DraggableItem>
      ))}
    </View>
  );
}

interface ItemProps {
  id: string;
  positions: ReturnType<typeof useSharedValue<PosMap>>;
  count: number;
  onCommit: (map: PosMap) => void;
  children: ReactNode;
}

function DraggableItem({ id, positions, count, onCommit, children }: ItemProps) {
  const top = useSharedValue((positions.value[id] ?? 0) * ITEM_HEIGHT);
  const active = useSharedValue(false);
  const startTop = useSharedValue(0);

  useAnimatedReaction(
    () => positions.value[id],
    (idx, prev) => {
      if (idx != null && !active.value && idx !== prev) {
        top.value = withSpring(idx * ITEM_HEIGHT, { damping: 20 });
      }
    }
  );

  const buzz = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      active.value = true;
      startTop.value = top.value;
      runOnJS(buzz)();
    })
    .onUpdate((e) => {
      top.value = startTop.value + e.translationY;
      const newIndex = clamp(Math.round(top.value / ITEM_HEIGHT), 0, count - 1);
      const curIndex = positions.value[id];
      if (newIndex !== curIndex) {
        positions.value = objectMove(positions.value, curIndex, newIndex);
      }
    })
    .onFinalize(() => {
      active.value = false;
      top.value = withSpring((positions.value[id] ?? 0) * ITEM_HEIGHT, { damping: 20 });
      runOnJS(onCommit)(positions.value);
    });

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    top: top.value,
    height: ITEM_HEIGHT,
    zIndex: active.value ? 100 : 0,
    elevation: active.value ? 8 : 0,
    transform: [{ scale: withSpring(active.value ? 1.03 : 1) }],
  }));

  return (
    <Animated.View style={style}>
      <GestureDetector gesture={pan}>
        <Animated.View>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
