import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  sendPasswordResetEmail,
  signInWithEmail,
  signUpWithEmail,
} from '../src/lib/supabase';
import { useColors } from '../src/lib/useColors';
import { Palette, radius, spacing } from '../src/theme';

type Mode = 'signin' | 'signup' | 'forgot';

export default function AuthScreen() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setResetSent(false);
  };

  const submit = async () => {
    if (mode === 'forgot') {
      if (!email.trim()) {
        Alert.alert('Email required', 'Enter the email you signed up with.');
        return;
      }
      setBusy(true);
      try {
        const { error } = await sendPasswordResetEmail(email.trim());
        if (error) Alert.alert('Could not send', error.message);
        else setResetSent(true);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!email.trim() || password.length < 6) {
      Alert.alert(
        'Check your inputs',
        'Email is required and password must be at least 6 characters.'
      );
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUpWithEmail(email.trim(), password);
        if (error) {
          Alert.alert('Sign up failed', error.message);
        } else {
          Alert.alert(
            'Check your email',
            'We sent you a confirmation link. Verify your email, then sign in.'
          );
          setMode('signin');
        }
      } else {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) Alert.alert('Sign in failed', error.message);
        // Auth state change handler will route on success.
      }
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === 'signin'
      ? 'Welcome back'
      : mode === 'signup'
        ? 'Create your account'
        : 'Reset your password';

  const sub =
    mode === 'signin'
      ? 'Sign in to sync your habits across devices.'
      : mode === 'signup'
        ? 'Your habits stay safe and accessible from anywhere.'
        : "Enter your email and we'll send you a link to set a new password.";

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.kicker}>HABITTRACKER</Text>
          <Animated.Text key={mode} entering={FadeIn.duration(220)} style={s.title}>
            {title}
          </Animated.Text>
          <Text style={s.sub}>{sub}</Text>

          {mode !== 'forgot' && (
            <View style={s.tabs}>
              <Pressable
                onPress={() => switchMode('signin')}
                style={[s.tab, mode === 'signin' && { backgroundColor: c.primary }]}
              >
                <Text style={[s.tabText, mode === 'signin' && { color: c.onPrimary }]}>
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                onPress={() => switchMode('signup')}
                style={[s.tab, mode === 'signup' && { backgroundColor: c.primary }]}
              >
                <Text style={[s.tabText, mode === 'signup' && { color: c.onPrimary }]}>
                  Sign Up
                </Text>
              </Pressable>
            </View>
          )}

          {/* --- Forgot password success state --- */}
          {mode === 'forgot' && resetSent ? (
            <Animated.View entering={FadeIn.duration(280)} style={s.successCard}>
              <Text style={s.successIcon}>✉️</Text>
              <Text style={s.successTitle}>Check your inbox</Text>
              <Text style={s.successText}>
                We sent a password reset link to{'\n'}
                <Text style={{ color: c.text, fontWeight: '700' }}>{email.trim()}</Text>
              </Text>
              <Text style={s.successHint}>
                Click the link, set a new password, then come back here and sign in.
              </Text>
              <Pressable style={s.cta} onPress={() => switchMode('signin')}>
                <Text style={s.ctaText}>Back to sign in</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <>
              <Text style={s.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={c.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={s.input}
              />

              {mode !== 'forgot' && (
                <>
                  <Text style={s.label}>Password</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor={c.textDim}
                    secureTextEntry
                    style={s.input}
                  />
                </>
              )}

              <Pressable
                style={[s.cta, busy && { opacity: 0.6 }]}
                onPress={submit}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={c.onPrimary} />
                ) : (
                  <Text style={s.ctaText}>
                    {mode === 'signin'
                      ? 'Sign in'
                      : mode === 'signup'
                        ? 'Create account'
                        : 'Send reset link'}
                  </Text>
                )}
              </Pressable>

              {mode === 'signin' && (
                <Pressable style={s.linkBtn} onPress={() => switchMode('forgot')}>
                  <Text style={[s.link, { color: c.primary }]}>Forgot password?</Text>
                </Pressable>
              )}

              {mode === 'forgot' && (
                <Pressable style={s.linkBtn} onPress={() => switchMode('signin')}>
                  <Text style={[s.link, { color: c.textDim }]}>← Back to sign in</Text>
                </Pressable>
              )}
            </>
          )}

          <Text style={s.fineprint}>
            Your data is scoped to your account via Row Level Security on every table.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingTop: spacing.xl * 2 },
    kicker: { color: c.primary, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
    title: { color: c.text, fontSize: 32, fontWeight: '800', marginTop: spacing.sm },
    sub: {
      color: c.textDim,
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.md,
      padding: 4,
      gap: 4,
      marginBottom: spacing.lg,
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
    tabText: { color: c.textDim, fontWeight: '700', fontSize: 14 },
    label: {
      color: c.textDim,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: spacing.md,
      color: c.text,
      fontSize: 16,
      marginBottom: spacing.sm,
    },
    cta: {
      backgroundColor: c.primary,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    ctaText: { color: c.onPrimary, fontSize: 16, fontWeight: '800' },
    linkBtn: { alignItems: 'center', paddingVertical: spacing.md },
    link: { fontSize: 14, fontWeight: '600' },
    successCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    successIcon: { fontSize: 44, marginBottom: spacing.sm },
    successTitle: { color: c.text, fontSize: 20, fontWeight: '800', marginTop: spacing.xs },
    successText: {
      color: c.textDim,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 22,
      marginTop: spacing.sm,
    },
    successHint: {
      color: c.textDim,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: spacing.md,
    },
    fineprint: {
      color: c.textDim,
      fontSize: 12,
      textAlign: 'center',
      marginTop: spacing.xl,
      lineHeight: 18,
    },
  });
