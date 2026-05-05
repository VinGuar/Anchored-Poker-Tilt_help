-- Anchored Supabase schema
-- Run this in Supabase SQL Editor for project:
-- dzzgvgtkepwrqmbtcpft

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  poker_alias text,
  preferred_stake text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  locale text not null default 'en-US',
  check_in_frequency_minutes integer not null default 45,
  pre_session_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings
  add column if not exists pre_session_note text not null default '';

alter table public.user_settings
  add column if not exists free_check_last_used date;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'current',
  start_time timestamptz not null,
  end_time timestamptz,
  net_buy_ins integer not null default 0,
  buy_ins_count integer not null default 0,
  buy_ins_lost integer not null default 0,
  pre_session_state jsonb,
  events jsonb not null default '[]'::jsonb,
  checks jsonb not null default '[]'::jsonb,
  session_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sessions
  add column if not exists status text not null default 'current';

alter table public.sessions
  add column if not exists coach_analysis jsonb;
alter table public.sessions
  add column if not exists buy_ins_count integer not null default 0;

update public.sessions
set status = case when end_time is null then 'current' else 'old' end
where true;

update public.sessions
set buy_ins_count = greatest(coalesce(buy_ins_count, 0), abs(coalesce(net_buy_ins, 0)));

create index if not exists idx_sessions_user_start_time
  on public.sessions (user_id, start_time desc);
create index if not exists idx_sessions_user_status
  on public.sessions (user_id, status);

alter table public.profiles
  drop constraint if exists profiles_display_name_len_check;
alter table public.profiles
  add constraint profiles_display_name_len_check check (display_name is null or char_length(display_name) <= 80) not valid;
alter table public.profiles validate constraint profiles_display_name_len_check;

alter table public.user_settings
  drop constraint if exists user_settings_theme_check;
alter table public.user_settings
  add constraint user_settings_theme_check check (theme in ('dark', 'light')) not valid;
alter table public.user_settings validate constraint user_settings_theme_check;

alter table public.user_settings
  drop constraint if exists user_settings_check_in_frequency_range;
alter table public.user_settings
  add constraint user_settings_check_in_frequency_range check (check_in_frequency_minutes between 5 and 240) not valid;
alter table public.user_settings validate constraint user_settings_check_in_frequency_range;

alter table public.user_settings
  drop constraint if exists user_settings_pre_session_note_len_check;
alter table public.user_settings
  add constraint user_settings_pre_session_note_len_check check (char_length(pre_session_note) <= 280) not valid;
alter table public.user_settings validate constraint user_settings_pre_session_note_len_check;

alter table public.sessions
  drop constraint if exists sessions_buy_ins_lost_nonnegative;
alter table public.sessions
  add constraint sessions_buy_ins_lost_nonnegative check (buy_ins_lost >= 0) not valid;
alter table public.sessions validate constraint sessions_buy_ins_lost_nonnegative;

alter table public.sessions
  drop constraint if exists sessions_buy_ins_count_nonnegative;
alter table public.sessions
  add constraint sessions_buy_ins_count_nonnegative check (buy_ins_count >= 0) not valid;
alter table public.sessions validate constraint sessions_buy_ins_count_nonnegative;

alter table public.sessions
  drop constraint if exists sessions_end_after_start;
alter table public.sessions
  add constraint sessions_end_after_start check (end_time is null or end_time >= start_time) not valid;
alter table public.sessions validate constraint sessions_end_after_start;

alter table public.sessions
  drop constraint if exists sessions_events_array_check;
alter table public.sessions
  add constraint sessions_events_array_check check (jsonb_typeof(events) = 'array') not valid;
alter table public.sessions validate constraint sessions_events_array_check;

alter table public.sessions
  drop constraint if exists sessions_checks_array_check;
alter table public.sessions
  add constraint sessions_checks_array_check check (jsonb_typeof(checks) = 'array') not valid;
alter table public.sessions validate constraint sessions_checks_array_check;

alter table public.sessions
  drop constraint if exists sessions_events_size_check;
alter table public.sessions
  add constraint sessions_events_size_check check (jsonb_array_length(events) <= 500) not valid;
alter table public.sessions validate constraint sessions_events_size_check;

alter table public.sessions
  drop constraint if exists sessions_checks_size_check;
alter table public.sessions
  add constraint sessions_checks_size_check check (jsonb_array_length(checks) <= 500) not valid;
alter table public.sessions validate constraint sessions_checks_size_check;

alter table public.sessions
  drop constraint if exists sessions_session_note_len_check;
alter table public.sessions
  add constraint sessions_session_note_len_check check (session_note is null or char_length(session_note) <= 500) not valid;
alter table public.sessions validate constraint sessions_session_note_len_check;

alter table public.sessions
  drop constraint if exists sessions_status_check;
alter table public.sessions
  add constraint sessions_status_check check (status in ('current', 'old')) not valid;
alter table public.sessions validate constraint sessions_status_check;

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.sessions enable row level security;

-- Profiles policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- User settings policies
drop policy if exists "Users can view own settings" on public.user_settings;
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sessions policies
drop policy if exists "Users can view own sessions" on public.sessions;
create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own sessions" on public.sessions;
create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own sessions" on public.sessions;
create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sessions" on public.sessions;
create policy "Users can delete own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);

create table if not exists public.tilt_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_input jsonb,
  profile_report jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tilt_profiles enable row level security;

drop policy if exists "Users can view own tilt profile" on public.tilt_profiles;
create policy "Users can view own tilt profile"
  on public.tilt_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own tilt profile" on public.tilt_profiles;
create policy "Users can insert own tilt profile"
  on public.tilt_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own tilt profile" on public.tilt_profiles;
create policy "Users can update own tilt profile"
  on public.tilt_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_tilt_profiles_updated_at on public.tilt_profiles;
create trigger set_tilt_profiles_updated_at
  before update on public.tilt_profiles
  for each row execute procedure public.set_updated_at();

-- Automatically create profile + default settings after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_sessions_updated_at on public.sessions;
create trigger set_sessions_updated_at
  before update on public.sessions
  for each row execute procedure public.set_updated_at();

-- Self-serve account deletion endpoint for authenticated users.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
