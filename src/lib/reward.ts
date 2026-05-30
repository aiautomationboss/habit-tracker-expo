import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useHabits } from '../store/useHabits';

let chime: AudioPlayer | null = null;
let celebrate: AudioPlayer | null = null;
let loaded = false;

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    setAudioModeAsync({ playsInSilentMode: true });
    chime = createAudioPlayer(require('../../assets/sounds/chime.wav'));
    celebrate = createAudioPlayer(require('../../assets/sounds/celebrate.wav'));
  } catch {
    // Audio is best-effort; never block the UI on it.
  }
}

function play(player: AudioPlayer | null) {
  if (!player) return;
  if (!useHabits.getState().soundsEnabled) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // ignore — audio must never break the interaction
  }
}

// Fired on a single habit completion.
export function rewardComplete(isMilestone: boolean) {
  Haptics.notificationAsync(
    isMilestone
      ? Haptics.NotificationFeedbackType.Warning
      : Haptics.NotificationFeedbackType.Success
  ).catch(() => {});
  if (isMilestone) {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 90);
  }
  ensureLoaded();
  play(chime);
}

// Fired when every habit for the day is finished.
export function rewardAllDone() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 120);
  ensureLoaded();
  play(celebrate);
}

// A light tick for incremental taps on quantity habits.
export function rewardTick() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
