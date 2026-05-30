import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Bucket } from '../lib/stats';
import { useColors } from '../lib/useColors';
import { radius, spacing } from '../theme';

interface BarProps {
  ratio: number;
  label: string;
  showValue: boolean;
  accent: string;
  track: string;
  textDim: string;
}

function Bar({ ratio, label, showValue, accent, track, textDim }: BarProps) {
  const h = useSharedValue(0);
  // Re-animates whenever ratio changes (e.g. on range switch).
  h.value = withTiming(Math.max(ratio, 0.015), { duration: 450 });
  const style = useAnimatedStyle(() => ({ height: `${h.value * 100}%` }));

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.col}>
      {showValue && (
        <Text style={[styles.value, { color: textDim }]}>
          {ratio > 0 ? Math.round(ratio * 100) : ''}
        </Text>
      )}
      <View style={[styles.track, { backgroundColor: track }]}>
        <Animated.View style={[styles.bar, { backgroundColor: accent }, style]} />
      </View>
      <Text style={[styles.label, { color: textDim }]} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

export function BarChart({ buckets, accent }: { buckets: Bucket[]; accent?: string }) {
  const c = useColors();
  const color = accent ?? c.primary;
  const showValue = buckets.length <= 7;

  if (buckets.length === 0) {
    return <Text style={[styles.empty, { color: c.textDim }]}>No data for this range yet.</Text>;
  }

  return (
    <View style={styles.row}>
      {buckets.map((b) => (
        <Bar
          key={b.key}
          ratio={b.ratio}
          label={b.label}
          showValue={showValue}
          accent={color}
          track={c.surfaceAlt}
          textDim={c.textDim}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', height: 140, gap: 4 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  value: { fontSize: 10, fontWeight: '700', height: 13 },
  track: { width: '64%', flex: 1, borderRadius: radius.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: radius.sm },
  label: { fontSize: 11, fontWeight: '600' },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: spacing.xl },
});
