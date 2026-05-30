import { useMemo } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabits } from '../../src/store/useHabits';
import { disableAllNotifications, syncNotifications } from '../../src/lib/notifications';
import { exportData, importData } from '../../src/lib/backup';
import { signOut } from '../../src/lib/supabase';
import { stopSync } from '../../src/lib/sync';
import { TimeField } from '../../src/components/TimeField';
import { useColors } from '../../src/lib/useColors';
import { ThemeName } from '../../src/types';
import { Palette, radius, spacing } from '../../src/theme';

const THEME_OPTIONS: { value: ThemeName; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const theme = useHabits((st) => st.theme);
  const setTheme = useHabits((st) => st.setTheme);
  const reminderEnabled = useHabits((st) => st.reminderEnabled);
  const reminderHour = useHabits((st) => st.reminderHour);
  const reminderMinute = useHabits((st) => st.reminderMinute);
  const setReminder = useHabits((st) => st.setReminder);
  const soundsEnabled = useHabits((st) => st.soundsEnabled);
  const setSoundsEnabled = useHabits((st) => st.setSoundsEnabled);
  const resetAll = useHabits((st) => st.resetAll);

  const toggleReminder = async (v: boolean) => {
    setReminder({ enabled: v });
    if (v) {
      const ok = await syncNotifications();
      if (!ok) {
        setReminder({ enabled: false });
        Alert.alert(
          'Notifications blocked',
          'Enable notifications for this app in your system settings to get reminders.'
        );
      }
    } else {
      await disableAllNotifications();
      await syncNotifications(); // keep any per-habit reminders alive
    }
  };

  const onTimeChange = (hour: number, minute: number) => {
    setReminder({ hour, minute });
    if (reminderEnabled) syncNotifications();
  };

  const onSignOut = () => {
    Alert.alert('Sign out', 'You can sign back in any time. Your data stays in the cloud.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: async () => {
          stopSync();
          await signOut();
        },
      },
    ]);
  };

  const onReset = () => {
    Alert.alert(
      'Reset app',
      'This permanently deletes all habits, history, notes, and challenges, and restarts onboarding. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset everything',
          style: 'destructive',
          onPress: async () => {
            await disableAllNotifications();
            resetAll();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const onExport = async () => {
    try {
      await exportData();
    } catch {
      Alert.alert('Export failed', 'Could not export your data.');
    }
  };

  const onImport = () => {
    Alert.alert(
      'Import data',
      'This will replace all current habits and history with the contents of the backup file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            const result = await importData();
            if (result === 'ok') {
              await syncNotifications();
              Alert.alert('Imported', 'Your data was restored from the backup.');
            } else if (result === 'error') {
              Alert.alert('Import failed', 'That file is not a valid HabitTracker backup.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Settings</Text>

        <Text style={s.section}>Appearance</Text>
        <View style={s.card}>
          <Text style={s.label}>Theme</Text>
          <View style={s.segment}>
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setTheme(opt.value)}
                  style={[s.segmentBtn, active && { backgroundColor: c.primary }]}
                >
                  <Text style={[s.segmentText, active && { color: c.onPrimary }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={s.section}>Feedback</Text>
        <View style={s.card}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Completion sounds</Text>
              <Text style={s.hint}>Chime when you complete a habit. Haptics stay on either way.</Text>
            </View>
            <Switch
              value={soundsEnabled}
              onValueChange={setSoundsEnabled}
              trackColor={{ true: c.primary, false: c.border }}
              thumbColor={c.surface}
            />
          </View>
        </View>

        <Text style={s.section}>Reminders</Text>
        <View style={s.card}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Daily reminder</Text>
              <Text style={s.hint}>A nudge to complete your habits, plus a 3 PM check-in.</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={toggleReminder}
              trackColor={{ true: c.primary, false: c.border }}
              thumbColor={c.surface}
            />
          </View>
          {reminderEnabled && (
            <View style={s.timeWrap}>
              <TimeField hour={reminderHour} minute={reminderMinute} onChange={onTimeChange} />
            </View>
          )}
        </View>

        <Text style={s.section}>Reflection</Text>
        <View style={s.card}>
          <Pressable style={s.dataRow} onPress={() => router.push('/reflection')}>
            <View style={{ flex: 1 }}>
              <Text style={s.dataLabel}>Weekly reflection</Text>
              <Text style={s.hint}>Look back at the week, set an intention.</Text>
            </View>
            <Text style={s.dataChevron}>›</Text>
          </Pressable>
        </View>

        <Text style={s.section}>Data</Text>
        <View style={s.card}>
          <Pressable style={s.dataRow} onPress={onExport}>
            <Text style={s.dataLabel}>Export backup</Text>
            <Text style={s.dataChevron}>↗</Text>
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.dataRow} onPress={onImport}>
            <Text style={s.dataLabel}>Import backup</Text>
            <Text style={s.dataChevron}>↘</Text>
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.dataRow} onPress={onReset}>
            <Text style={[s.dataLabel, { color: c.danger }]}>Reset app</Text>
            <Text style={[s.dataChevron, { color: c.danger }]}>⟲</Text>
          </Pressable>
        </View>

        <Text style={s.section}>Account</Text>
        <View style={s.card}>
          <Pressable style={s.dataRow} onPress={onSignOut}>
            <Text style={s.dataLabel}>Sign out</Text>
            <Text style={s.dataChevron}>↪</Text>
          </Pressable>
        </View>

        <Text style={s.footer}>HabitTracker · built across 4 phases + advanced features</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    title: { color: c.text, fontSize: 30, fontWeight: '800', marginBottom: spacing.lg },
    section: {
      color: c.textDim,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
    },
    label: { color: c.text, fontSize: 16, fontWeight: '600' },
    hint: { color: c.textDim, fontSize: 13, marginTop: 2 },
    segment: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.md,
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.md,
      padding: 4,
    },
    segmentBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
    segmentText: { color: c.textDim, fontSize: 15, fontWeight: '700' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    timeWrap: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border },
    dataRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
    dataLabel: { color: c.text, fontSize: 16, fontWeight: '600' },
    dataChevron: { color: c.primary, fontSize: 20, fontWeight: '800' },
    divider: { height: 1, backgroundColor: c.border, marginVertical: spacing.xs },
    footer: { color: c.textDim, fontSize: 13, textAlign: 'center', marginTop: spacing.xl },
  });
