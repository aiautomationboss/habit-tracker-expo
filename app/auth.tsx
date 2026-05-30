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
import { signInWithEmail, signUpWithEmail } from '../src/lib/supabase';
import { useColors } from '../src/lib/useColors';
import { Palette, radius, spacing } from '../src/theme';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Check your inputs', 'Email is required and password must be at least 6 characters.');
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
          <Text style={s.title}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={s.sub}>
            {mode === 'signin'
              ? 'Sign in to sync your habits across devices.'
              : 'Your habits stay safe and accessible from anywhere.'}
          </Text>

          <View style={s.tabs}>
            <Pressable
              onPress={() => setMode('signin')}
              style={[s.tab, mode === 'signin' && { backgroundColor: c.primary }]}
            >
              <Text
                style={[
                  s.tabText,
                  mode === 'signin' && { color: c.onPrimary },
                ]}
              >
                Sign In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('signup')}
              style={[s.tab, mode === 'signup' && { backgroundColor: c.primary }]}
            >
              <Text
                style={[
                  s.tabText,
                  mode === 'signup' && { color: c.onPrimary },
                ]}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>

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

          <Text style={s.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={c.textDim}
            secureTextEntry
            style={s.input}
          />

          <Pressable
            style={[s.cta, busy && { opacity: 0.6 }]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={c.onPrimary} />
            ) : (
              <Text style={s.ctaText}>
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            )}
          </Pressable>

          <Text style={s.fineprint}>
            Your data is end-to-end scoped to your account via Row Level Security.
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
    kicker: {
      color: c.primary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 2,
    },
    title: { color: c.text, fontSize: 32, fontWeight: '800', marginTop: spacing.sm },
    sub: { color: c.textDim, fontSize: 15, lineHeight: 22, marginTop: spacing.sm, marginBottom: spacing.lg },
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
    fineprint: {
      color: c.textDim,
      fontSize: 12,
      textAlign: 'center',
      marginTop: spacing.xl,
      lineHeight: 18,
    },
  });
