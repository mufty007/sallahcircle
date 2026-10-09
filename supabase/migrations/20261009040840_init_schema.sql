-- Salah Circle: initial schema
-- Tables live in `public` (exposed to the Data API, RLS on everything).
-- Privileged helpers live in `private` (not exposed), called from RLS policies
-- or wrapped by SECURITY INVOKER functions in `public`.

create extension if not exists citext with schema extensions;

create schema if not exists private;
grant usage on schema private to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Types
-- ─────────────────────────────────────────────────────────────
create type public.prayer_name as enum ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');
create type public.prayer_status as enum ('on_time', 'late', 'missed');
create type public.calc_method as enum ('isna', 'mwl', 'umm_al_qura', 'egyptian', 'karachi', 'dubai', 'qatar', 'kuwait', 'singapore', 'turkey', 'tehran', 'moonsighting');
create type public.asr_method as enum ('standard', 'hanafi');
create type public.reminder_sound as enum ('adhan', 'chime', 'silent');
create type public.circle_visibility as enum ('private', 'public');
create type public.circle_role as enum ('owner', 'member');
create type public.nudge_kind as enum ('nudge', 'dua', 'together', 'voice');

-- ─────────────────────────────────────────────────────────────
-- Code generator (invite / friend codes): 6 chars, no 0/O/1/I
-- ─────────────────────────────────────────────────────────────
create or replace function private.gen_code(len int default 6)
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, len);
$$;
grant execute on function private.gen_code(int) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Profiles (1:1 with auth.users)
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 40),
  username extensions.citext unique check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  avatar_color text not null default '#79DBB2' check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  friend_code text not null unique default private.gen_code(),
  -- Location: city-level only. Coordinates are rounded client-side (~1 km) and are
  -- used to compute this member's prayer times for their circles.
  city text,
  region text,
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  timezone text,
  calc_method public.calc_method not null default 'isna',
  asr_method public.asr_method not null default 'standard',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Reminder preferences
-- ─────────────────────────────────────────────────────────────
create table public.reminder_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  heads_up_minutes int not null default 10 check (heads_up_minutes in (0, 5, 10, 15, 30)),
  allow_nudges boolean not null default true,
  quiet_start time default '23:00',
  quiet_end time default '03:30',
  updated_at timestamptz not null default now()
);

create table public.prayer_reminders (
  user_id uuid not null references public.profiles (id) on delete cascade,
  prayer public.prayer_name not null,
  enabled boolean not null default true,
  sound public.reminder_sound not null default 'chime',
  primary key (user_id, prayer)
);

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- ─────────────────────────────────────────────────────────────
-- Circles
-- ─────────────────────────────────────────────────────────────
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 32),
  color text not null default '#79DBB2' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  code text not null unique default private.gen_code(),
  visibility public.circle_visibility not null default 'private',
  focus text not null default 'All five prayers',
  description text check (char_length(description) <= 500),
  leaderboard_enabled boolean not null default true,
  nudges_enabled boolean not null default true,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.circle_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index circle_members_user_idx on public.circle_members (user_id);

-- ─────────────────────────────────────────────────────────────
-- Prayer log (circle-mates see status only, never the details)
-- ─────────────────────────────────────────────────────────────
create table public.prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  prayer public.prayer_name not null,
  prayed_on date not null, -- the user's local date
  status public.prayer_status not null,
  in_jamaah boolean not null default false,
  at_masjid boolean not null default false,
  logged_at timestamptz not null default now(),
  unique (user_id, prayed_on, prayer)
);
create index prayer_logs_user_date_idx on public.prayer_logs (user_id, prayed_on desc);

-- ─────────────────────────────────────────────────────────────
-- Nudges, duʿāʾ, pray-together invites, voice notes
-- ─────────────────────────────────────────────────────────────
create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  from_user uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  kind public.nudge_kind not null default 'nudge',
  prayer public.prayer_name not null,
  prayer_date date not null, -- recipient's local date for that prayer
  message text check (char_length(message) <= 140),
  voice_path text,
  response text check (char_length(response) <= 60),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index nudges_to_idx on public.nudges (to_user, created_at desc);
create index nudges_from_idx on public.nudges (from_user, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Private helpers (SECURITY DEFINER, not exposed via the API)
-- ─────────────────────────────────────────────────────────────
create or replace function private.is_circle_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.circle_members
    where circle_id = cid and user_id = (select auth.uid())
  );
$$;

create or replace function private.shares_circle_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.circle_members a
    join public.circle_members b on a.circle_id = b.circle_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  );
$$;

create or replace function private.is_username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and not exists (
      select 1 from public.profiles
      where username = name::extensions.citext and id <> (select auth.uid())
    );
$$;

create or replace function private.join_circle(invite_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cid uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select id into cid from public.circles where code = upper(trim(invite_code));
  if cid is null then
    raise exception 'No circle found for that code' using errcode = 'P0002';
  end if;
  insert into public.circle_members (circle_id, user_id) values (cid, uid)
  on conflict do nothing;
  return cid;
end;
$$;

revoke all on function private.is_circle_member(uuid) from public;
revoke all on function private.shares_circle_with(uuid) from public;
revoke all on function private.is_username_available(text) from public;
revoke all on function private.join_circle(text) from public;
grant execute on function private.is_circle_member(uuid) to authenticated;
grant execute on function private.shares_circle_with(uuid) to authenticated;
grant execute on function private.is_username_available(text) to authenticated;
grant execute on function private.join_circle(text) to authenticated;

-- Public RPC wrappers (SECURITY INVOKER; the private function does the checks)
create or replace function public.username_available(name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_username_available(name); $$;

create or replace function public.join_circle(invite_code text)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$ select private.join_circle(invite_code); $$;

revoke all on function public.username_available(text) from public, anon;
revoke all on function public.join_circle(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;
grant execute on function public.join_circle(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────

-- New auth user → profile + default reminder settings.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 40), '')
  );
  insert into public.reminder_settings (user_id) values (new.id);
  insert into public.prayer_reminders (user_id, prayer, sound)
  select new.id, p, case when p in ('fajr', 'maghrib') then 'adhan'::public.reminder_sound else 'chime'::public.reminder_sound end
  from unnest(enum_range(null::public.prayer_name)) as p;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Circle creator becomes its owner.
create or replace function private.handle_new_circle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.circle_members (circle_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end;
$$;
create trigger on_circle_created
  after insert on public.circles
  for each row execute function private.handle_new_circle();

-- Max 2 nudges from one person to another per prayer.
create or replace function private.limit_nudges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.nudges
    where from_user = new.from_user and to_user = new.to_user
      and prayer = new.prayer and prayer_date = new.prayer_date
  ) >= 2 then
    raise exception 'Nudge limit reached for this prayer' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger nudges_limit
  before insert on public.nudges
  for each row execute function private.limit_nudges();

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger reminder_settings_touch before update on public.reminder_settings
  for each row execute function private.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Grants (explicit; Data API exposure is opt-in)
-- ─────────────────────────────────────────────────────────────
revoke all on public.profiles, public.reminder_settings, public.prayer_reminders, public.push_tokens,
  public.circles, public.circle_members, public.prayer_logs, public.nudges from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.reminder_settings to authenticated;
grant select, insert, update on public.prayer_reminders to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;
grant select, insert, update, delete on public.circles to authenticated;
grant select, delete on public.circle_members to authenticated;
-- Circle-mates may read status columns only; in_jamaah / at_masjid stay private.
grant select (id, user_id, prayer, prayed_on, status, logged_at) on public.prayer_logs to authenticated;
grant insert, update, delete on public.prayer_logs to authenticated;
grant select, insert on public.nudges to authenticated;
grant update (response, responded_at) on public.nudges to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.reminder_settings enable row level security;
alter table public.prayer_reminders enable row level security;
alter table public.push_tokens enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.prayer_logs enable row level security;
alter table public.nudges enable row level security;

-- profiles
create policy "profiles: read self and circle-mates" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_circle_with(id));
create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- reminder settings / reminders / push tokens: owner only
create policy "reminder_settings: owner" on public.reminder_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "prayer_reminders: owner" on public.prayer_reminders
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "push_tokens: owner" on public.push_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- circles
create policy "circles: read public, own, or joined" on public.circles
  for select to authenticated
  using (visibility = 'public' or created_by = (select auth.uid()) or private.is_circle_member(id));
create policy "circles: create as self" on public.circles
  for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "circles: owner updates" on public.circles
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));
create policy "circles: owner deletes" on public.circles
  for delete to authenticated
  using (created_by = (select auth.uid()));

-- circle members (joining happens through join_circle(); creation through the trigger)
create policy "circle_members: read own circles" on public.circle_members
  for select to authenticated
  using (private.is_circle_member(circle_id));
create policy "circle_members: leave" on public.circle_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- prayer logs
create policy "prayer_logs: read self and circle-mates" on public.prayer_logs
  for select to authenticated
  using (user_id = (select auth.uid()) or private.shares_circle_with(user_id));
create policy "prayer_logs: insert self" on public.prayer_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "prayer_logs: update self" on public.prayer_logs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "prayer_logs: delete self" on public.prayer_logs
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- nudges
create policy "nudges: read sent or received" on public.nudges
  for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));
create policy "nudges: send within a shared circle" on public.nudges
  for insert to authenticated
  with check (
    from_user = (select auth.uid())
    and private.is_circle_member(circle_id)
    and exists (select 1 from public.circle_members m where m.circle_id = nudges.circle_id and m.user_id = nudges.to_user)
  );
create policy "nudges: recipient responds" on public.nudges
  for update to authenticated
  using (to_user = (select auth.uid()))
  with check (to_user = (select auth.uid()));
