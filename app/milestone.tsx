import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Confetti, ConfettiHandle } from '../src/components/Confetti';
import { rewardAllDone } from '../src/lib/reward';
import { useColors } from '../src/lib/useColors';
import { Palette, radius, spacing } from '../src/theme';

function bandFor(streak: number): string {
  if (streak >= 365) return 'Year of momentum';
  if (streak >= 200) return 'Legend';
  if (streak >= 100) return 'Triple digits';
  if (streak >= 50) return 'Half a century';
  if (streak >= 30) return 'A full month';
  if (streak >= 14) return 'Two weeks strong';
  return 'One week strong';
}

export default function MilestoneScreen() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const params = useLocalSearchParams<{
    streak: string;
    habitName: string;
    habitIcon: string;
    color: string;
  }>();
  const streak = parseInt(params.streak ?? '0', 10);
  const habitName = params.habitName ?? '';
  const habitIcon = params.habitIcon ?? '🎉';
  const color = params.color ?? c.primary;

  const confetti = useRef<ConfettiHandle>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      confetti.current?.fire(195, 280, 3);
      rewardAllDone();
    }, 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.body}>
        <Animated.Text entering={FadeIn.duration(400)} style={s.kicker}>
          MILESTONE
        </Animated.Text>
        <Animated.View entering={ZoomIn.duration(500)} style={[s.ring, { borderColor: color }]}>
          <Text style={[s.num, { color }]}>{streak}</Text>
          <Text style={s.dayLabel}>days</Text>
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={s.band}>
          {bandFor(streak)}
        </Animated.Text>
        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={s.habitRow}>
          <Text style={s.habitIcon}>{habitIcon}</Text>
          <Text style={s.habitName}>{habitName}</Text>
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(500).duration(400)} style={s.tag}>
          That's what consistency looks like.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(700).duration(400)} style={s.footer}>
        <Pressable style={[s.cta, { backgroundColor: color }]} onPress={() => router.back()}>
          <Text style={[s.ctaText, { color: c.onPrimary }]}>Keep going</Text>
        </Pressable>
      </Animated.View>

      <Confetti ref={confetti} />
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    kicker: {
      color: c.textDim,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 2,
    },
    ring: {
      width: 220,
      height: 220,
      borderRadius: 110,
      borderWidth: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xl,
    },
    num: { fontSize: 96, fontWeight: '900', lineHeight: 100 },
    dayLabel: { color: c.textDim, fontSize: 16, fontWeight: '700', marginTop: -8 },
    band: {
      color: c.text,
      fontSize: 22,
      fontWeight: '800',
      marginTop: spacing.xl,
      textAlign: 'center',
    },
    habitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    habitIcon: { fontSize: 26 },
    habitName: { color: c.text, fontSize: 18, fontWeight: '600' },
    tag: {
      color: c.textDim,
      fontSize: 14,
      fontStyle: 'italic',
      marginTop: spacing.md,
      textAlign: 'center',
    },
    footer: { padding: spacing.lg },
    cta: {
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    ctaText: { fontSize: 16, fontWeight: '800' },
  });
