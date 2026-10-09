-- Excused days (ḥayḍ / nifās): opt-in and private.
-- The periods themselves are owner-only. Circle-mates only ever see profiles.paused_since,
-- which carries no reason, and nudges to a paused member are blocked.

create type public.excuse_kind as enum ('hayd', 'nifas');

alter table public.profiles
  add column track_excused boolean not null default false,
  add column track_sunnah boolean not null default false,
  add column paused_since date;

create table public.excused_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind public.excuse_kind not null default 'hayd',
  started_on date not null,
  ended_on date,
  created_at timestamptz not null default now(),
  check (ended_on is null or ended_on >= started_on)
);
create index excused_periods_user_idx on public.excused_periods (user_id, started_on desc);
-- At most one open period per person.
create unique index excused_periods_one_open on public.excused_periods (user_id) where ended_on is null;

alter table public.excused_periods enable row level security;
revoke all on public.excused_periods from anon;
grant select, insert, update, delete on public.excused_periods to authenticated;
create policy "excused_periods: owner" on public.excused_periods
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Keep the neutral "paused" flag in step with the open period.
create or replace function private.sync_pause()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := coalesce(new.user_id, old.user_id);
begin
  update public.profiles
  set paused_since = (select started_on from public.excused_periods where user_id = uid and ended_on is null limit 1)
  where id = uid;
  return null;
end;
$$;
create trigger excused_periods_sync_pause
  after insert or update or delete on public.excused_periods
  for each row execute function private.sync_pause();

-- Nudges also skip paused members.
create or replace function private.can_nudge(cid uuid, recipient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_circle_member(cid)
    and exists (select 1 from public.circle_members m where m.circle_id = cid and m.user_id = recipient)
    and coalesce((select c.nudges_enabled from public.circles c where c.id = cid), false)
    and coalesce((select s.allow_nudges from public.reminder_settings s where s.user_id = recipient), true)
    and coalesce((select p.paused_since is null from public.profiles p where p.id = recipient), true);
$$;
