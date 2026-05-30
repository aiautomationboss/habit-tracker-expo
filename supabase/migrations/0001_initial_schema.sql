-- HabitTracker initial schema.
-- Apply via: Supabase Dashboard → SQL Editor → paste this file → Run.
-- Or via CLI: supabase db push (after linking).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. profiles  (1 row per auth user)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  theme text default 'dark' check (theme in ('dark','light','system')),
  reminder_enabled boolean default false,
  reminder_hour int default 20 check (reminder_hour between 0 and 23),
  reminder_minute int default 0 check (reminder_minute between 0 and 59),
  sounds_enabled boolean default true,
  onboarded boolean default false,
  last_opened_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. habits
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.habits (
  id text primary key,                           -- client-generated uid
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  type text not null check (type in ('daily','quantity')),
  target int not null default 1,
  color text not null,
  icon text not null,
  "order" int not null default 0,
  schedule int[] not null default '{}',          -- 0..6, [] = every day
  reminder_hour int,
  reminder_minute int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_habits_user on public.habits(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. completions
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.completions (
  user_id uuid not null references auth.users on delete cascade,
  habit_id text not null references public.habits on delete cascade,
  day_key text not null,                         -- yyyy-MM-dd
  count int not null default 0 check (count >= 0),
  updated_at timestamptz default now(),
  primary key (user_id, habit_id, day_key)
);
create index if not exists idx_completions_user_day on public.completions(user_id, day_key);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. day notes
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.day_notes (
  user_id uuid not null references auth.users on delete cascade,
  day_key text not null,
  note text not null default '',
  updated_at timestamptz default now(),
  primary key (user_id, day_key)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. weekly reflections
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.reflections (
  user_id uuid not null references auth.users on delete cascade,
  week_key text not null,                        -- yyyy-MM-dd (Monday)
  worked text default '',
  obstacles text default '',
  intention text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, week_key)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. challenges (one active per user; soft-deleted by replacement)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.challenges (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  habit_ids text[] not null default '{}',
  duration_days int not null,
  start_date text not null,
  created_at timestamptz default now()
);
create index if not exists idx_challenges_user on public.challenges(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at trigger helper
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_habits_touch on public.habits;
create trigger trg_habits_touch before update on public.habits
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_completions_touch on public.completions;
create trigger trg_completions_touch before update on public.completions
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_notes_touch on public.day_notes;
create trigger trg_notes_touch before update on public.day_notes
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_reflections_touch on public.reflections;
create trigger trg_reflections_touch before update on public.reflections
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Auto-create a profile row when a user signs up
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security — every row is scoped to auth.uid()
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.habits      enable row level security;
alter table public.completions enable row level security;
alter table public.day_notes   enable row level security;
alter table public.reflections enable row level security;
alter table public.challenges  enable row level security;

-- profiles: each user reads/updates only their own row
drop policy if exists "profiles_select_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_select_own"  on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own"  on public.profiles for update using (id = auth.uid());
create policy "profiles_insert_self" on public.profiles for insert with check (id = auth.uid());

-- habits
drop policy if exists "habits_select_own" on public.habits;
drop policy if exists "habits_insert_own" on public.habits;
drop policy if exists "habits_update_own" on public.habits;
drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_select_own" on public.habits for select using (user_id = auth.uid());
create policy "habits_insert_own" on public.habits for insert with check (user_id = auth.uid());
create policy "habits_update_own" on public.habits for update using (user_id = auth.uid());
create policy "habits_delete_own" on public.habits for delete using (user_id = auth.uid());

-- completions
drop policy if exists "completions_select_own" on public.completions;
drop policy if exists "completions_insert_own" on public.completions;
drop policy if exists "completions_update_own" on public.completions;
drop policy if exists "completions_delete_own" on public.completions;
create policy "completions_select_own" on public.completions for select using (user_id = auth.uid());
create policy "completions_insert_own" on public.completions for insert with check (user_id = auth.uid());
create policy "completions_update_own" on public.completions for update using (user_id = auth.uid());
create policy "completions_delete_own" on public.completions for delete using (user_id = auth.uid());

-- day_notes
drop policy if exists "notes_select_own" on public.day_notes;
drop policy if exists "notes_insert_own" on public.day_notes;
drop policy if exists "notes_update_own" on public.day_notes;
drop policy if exists "notes_delete_own" on public.day_notes;
create policy "notes_select_own" on public.day_notes for select using (user_id = auth.uid());
create policy "notes_insert_own" on public.day_notes for insert with check (user_id = auth.uid());
create policy "notes_update_own" on public.day_notes for update using (user_id = auth.uid());
create policy "notes_delete_own" on public.day_notes for delete using (user_id = auth.uid());

-- reflections
drop policy if exists "reflections_select_own" on public.reflections;
drop policy if exists "reflections_insert_own" on public.reflections;
drop policy if exists "reflections_update_own" on public.reflections;
drop policy if exists "reflections_delete_own" on public.reflections;
create policy "reflections_select_own" on public.reflections for select using (user_id = auth.uid());
create policy "reflections_insert_own" on public.reflections for insert with check (user_id = auth.uid());
create policy "reflections_update_own" on public.reflections for update using (user_id = auth.uid());
create policy "reflections_delete_own" on public.reflections for delete using (user_id = auth.uid());

-- challenges
drop policy if exists "challenges_select_own" on public.challenges;
drop policy if exists "challenges_insert_own" on public.challenges;
drop policy if exists "challenges_update_own" on public.challenges;
drop policy if exists "challenges_delete_own" on public.challenges;
create policy "challenges_select_own" on public.challenges for select using (user_id = auth.uid());
create policy "challenges_insert_own" on public.challenges for insert with check (user_id = auth.uid());
create policy "challenges_update_own" on public.challenges for update using (user_id = auth.uid());
create policy "challenges_delete_own" on public.challenges for delete using (user_id = auth.uid());
