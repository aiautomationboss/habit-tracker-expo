import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useHabits } from '../store/useHabits';
import { dayKeyOffset } from '../lib/date';
import { useColors } from '../lib/useColors';
import { Palette, spacing } from '../theme';

const WEEKS = 13;
const DAYS = WEEKS * 7;
const CELL = 14;
const GAP = 3;

function bucketColor(ratio: number, c: Palette): string {
  if (ratio <= 0) return c.surfaceAlt;
  if (ratio < 0.34) return c.primary + '40';
  if (ratio < 0.67) return c.primary + '80';
  if (ratio < 1) return c.primary + 'C0';
  return c.primary;
}

export function Heatmap() {
  const c = useColors();
  const completions = useHabits((s) => s.completions);
  const dayRatio = useHabits((s) => s.dayRatio);

  // Build columns (weeks) of 7 cells, oldest first.
  const weeks = useMemo(() => {
    const cells: { key: string; ratio: number }[] = [];
    for (let offset = DAYS - 1; offset >= 0; offset--) {
      const key = dayKeyOffset(offset);
      cells.push({ key, ratio: dayRatio(key) });
    }
    const cols: { key: string; ratio: number }[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      cols.push(cells.slice(i, i + 7));
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completions]);

  return (
    <View>
      <View style={styles.grid}>
        {weeks.map((col, ci) => (
          <View key={ci} style={{ gap: GAP }}>
            {col.map((cell) => (
              <Pressable
                key={cell.key}
                onPress={() => router.push({ pathname: '/day-detail', params: { day: cell.key } })}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  backgroundColor: bucketColor(cell.ratio, c),
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: c.textDim }]}>Less</Text>
        {[0, 0.3, 0.6, 0.9, 1].map((r) => (
          <View
            key={r}
            style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: bucketColor(r, c) }}
          />
        ))}
        <Text style={[styles.legendText, { color: c.textDim }]}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: GAP, justifyContent: 'center' },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  legendText: { fontSize: 12, marginHorizontal: 4 },
});
