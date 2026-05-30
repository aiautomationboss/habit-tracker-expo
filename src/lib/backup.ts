import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useHabits } from '../store/useHabits';
import { Snapshot } from '../types';

export async function exportData(): Promise<void> {
  const snap = useHabits.getState().buildSnapshot();
  const json = JSON.stringify(snap, null, 2);
  const uri = `${FileSystem.cacheDirectory}habittracker-backup-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(uri, json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export HabitTracker data',
      UTI: 'public.json',
    });
  }
}

export type ImportResult = 'ok' | 'cancel' | 'error';

export async function importData(): Promise<ImportResult> {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (res.canceled) return 'cancel';
  try {
    const json = await FileSystem.readAsStringAsync(res.assets[0].uri);
    const snap = JSON.parse(json) as Snapshot;
    if (!snap || !Array.isArray(snap.habits)) return 'error';
    useHabits.getState().importSnapshot(snap);
    return 'ok';
  } catch {
    return 'error';
  }
}
