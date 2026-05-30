# HabitTracker

A polished, offline-first habit tracker built with **Expo SDK 54** and
**React Native**. Designed around a single principle: an app that **comes
find you** instead of waiting to be opened.

> Built across 4 phases + an advanced-features pass. See
> [`CLAUDE.md`](./CLAUDE.md) for full architecture, conventions, and design
> notes.

---

## Highlights

### Core loop
- **Daily** and **quantity** habits (e.g. "Drink water — 8 glasses")
- Per-habit **schedule** (specific weekdays) with rest-day-aware streaks
- Per-habit **reminders** with a native time picker (independent of the
  global reminder)
- **Swipe** to complete (right) or delete (left) on the Today tab
- **Long-press** any habit to jump straight to its editor
- **Press-and-hold drag** to reorder on the Habits tab
- Tap a habit's circle to **toggle done / undone** — works for daily and
  quantity types

### Reward loop
- Haptics (lighter for ticks, heavier for milestones)
- Two procedurally-generated chimes (`chime.wav`, `celebrate.wav`)
- Reanimated 4 confetti burst at the row's position
- **Milestone celebration screen** at 7 / 14 / 30 / 50 / 100 / 200 / 365-day
  streaks
- Mutable via Settings → Feedback → Completion sounds

### Today dashboard
- **Best active streak** hero card with habit name and "on a roll" badge
- 7-day completion strip with today highlighted
- Existing checklist with progress bar
- Sunday **weekly reflection** banner
- **Comeback flow** card after a 7+ day absence (Pick up / Start fresh)
- Active **challenge banner** when one is in progress

### History
- **Dropdown** period selector: This Week · Last Week · This Month · Last
  Month · 6 Months · This Year
- **Adaptive bar chart** — daily bars for weeks, weekly bars for months,
  monthly bars for 6mo/year
- Per-period **completion rate**, perfect days, active days, per-habit %
- **Insights** card with rule-based patterns ("Tuesdays are your best day —
  92%")
- **13-week heatmap** — tap any day to edit completions and add a note

### Challenges
- 4 preset lengths: **3 days · 1 week · 1 month · 1 year**
- Pick which habits count
- Short challenges show day-by-day circles; long ones show a progress bar
- Celebration on completion (confetti + sound)

### Retention pack
- **Lapse nudge** — one batched notification at 9 AM when any habit's been
  silent for 3+ days
- **Streak-at-risk** — 8 PM nightly warning when any habit has an active
  streak ≥ 3
- **Weekly reflection** — Sunday 8 PM, opens a reflection screen with:
  - This week's completion % and perfect-days count
  - Current vs **best streak** comparison per habit (bar)
  - Three journaling prompts: what worked / what got in the way / one
    intention
- **Comeback flow** — soft welcome-back card if you return after 7+ days

### Theming
- Dark / Light / **System** (follows OS)
- Whole app re-themes cleanly via a `useColors()` hook

### Data
- Persisted locally via AsyncStorage with versioned migrations
- **Export** to JSON via the system share sheet
- **Import** from a backup file
- **Reset app** action that wipes everything and replays onboarding

### Onboarding
- "How habits stick" coaching card (3 short principles)
- Create your own, quick-add suggestions, or both

---

## Stack

- React Native 0.81 · Expo SDK 54
- expo-router 6 (file-based routing)
- zustand + persist (AsyncStorage)
- react-native-reanimated 4 (worklets) + gesture-handler
- expo-audio, expo-haptics, expo-notifications
- @react-native-community/datetimepicker
- @expo/vector-icons (Ionicons for tab chrome)
- TypeScript (strict)

---

## Running locally

```bash
# install
npm install --legacy-peer-deps

# Expo Go dev server
npx expo start

# Or directly:
npm run android
npm run ios
npm run web

# Typecheck
npx tsc --noEmit

# Verify the full bundle compiles
npx expo export --platform android
```

Scan the QR with **Expo Go** on Android (the project targets SDK 54 — make
sure Expo Go is at least 54.x).

---

## Known limitations in Expo Go

Local scheduled notifications work but have **reliability issues since SDK
53**. The retention pack (lapse / streak-at-risk / weekly reflection) is
logically correct; reliable delivery and home-screen widgets require a
**development build**:

```bash
npx expo run:android
```

The expo-notifications push-token warning shown at boot is silenced via
`LogBox.ignoreLogs(...)` — it's an expected Expo Go limitation, not a bug.

---

## License

MIT — see `LICENSE`.
