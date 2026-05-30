import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { habitColors } from '../theme';

export interface ConfettiHandle {
  fire: (x: number, y: number, intensity?: number) => void;
}

const MAX_PARTICLES = 60;

interface ParticleProps {
  burst: number;
  x: number;
  y: number;
  active: boolean;
  big: boolean;
}

function Particle({ burst, x, y, active, big }: ParticleProps) {
  const progress = useSharedValue(0);

  const p = useMemo(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = (big ? 140 : 90) + Math.random() * (big ? 180 : 120);
    return {
      angle,
      distance,
      rotate: (Math.random() - 0.5) * 720,
      color: habitColors[Math.floor(Math.random() * habitColors.length)],
      size: 6 + Math.random() * (big ? 10 : 7),
      square: Math.random() > 0.5,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burst]);

  useEffect(() => {
    if (burst === 0 || !active) return;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 850 + Math.random() * 300,
      easing: Easing.out(Easing.quad),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burst]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const dx = Math.cos(p.angle) * p.distance * t;
    const dy = Math.sin(p.angle) * p.distance * t + 160 * t * t;
    return {
      opacity: active ? 1 - t : 0,
      transform: [
        { translateX: dx },
        { translateY: dy },
        { rotate: `${p.rotate * t}deg` },
        { scale: 0.6 + 0.4 * (1 - t) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: p.size,
          height: p.size,
          borderRadius: p.square ? 2 : p.size,
          backgroundColor: p.color,
        },
        style,
      ]}
    />
  );
}

export const Confetti = forwardRef<ConfettiHandle>((_props, ref) => {
  const { width, height } = useWindowDimensions();
  const [burst, setBurst] = useState(0);
  const [origin, setOrigin] = useState({ x: width / 2, y: height / 2 });
  const [count, setCount] = useState(24);
  const [big, setBig] = useState(false);

  useImperativeHandle(ref, () => ({
    fire: (x, y, intensity = 1) => {
      setOrigin({ x, y });
      setCount(Math.min(MAX_PARTICLES, Math.round(24 * intensity)));
      setBig(intensity > 1.5);
      setBurst((b) => b + 1);
    },
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: MAX_PARTICLES }).map((_, i) => (
        <Particle
          key={i}
          burst={burst}
          x={origin.x}
          y={origin.y}
          active={i < count}
          big={big}
        />
      ))}
    </View>
  );
});

Confetti.displayName = 'Confetti';
