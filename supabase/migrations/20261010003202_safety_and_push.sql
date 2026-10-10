-- Safety (block + report), Hijri date offset, and server-sent reminders.

-- ─────────────────────────────────────────────────────────────
-- Blocks: the blocker never hears from the blocked person again.
-- ─────────────────────────────────────────────────────────────
create table public.blocks (
  blocker uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;
revoke all on public.blocks from anon;
grant select, insert, delete on public.blocks to authenticated;
create policy "blocks: owner" on public.blocks
  for all to authenticated
  using (blocker = (select auth.uid()))
  with check (blocker = (select auth.uid()));

-- Either direction counts, so a blocked person can't nudge you and you don't nudge them by accident.
create or replace function private.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;
revoke all on function private.is_blocked(uuid, uuid) from public;
grant execute on function private.is_blocked(uuid, uuid) to authenticated;

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
    and coalesce((select p.paused_since is null from public.profiles p where p.id = recipient), true)
    and not private.is_blocked((select auth.uid()), recipient);
$$;

-- Hide nudges from people you've blocked (they stay for the sender).
drop policy "nudges: read sent or received" on public.nudges;
create policy "nudges: read sent or received" on public.nudges
  for select to authenticated
  using (
    from_user = (select auth.uid())
    or (to_user = (select auth.uid()) and not exists (select 1 from public.blocks b where b.blocker = (select auth.uid()) and b.blocked = nudges.from_user))
  );

-- ─────────────────────────────────────────────────────────────
-- Reports: reviewed in the Supabase dashboard. Public circles with
-- 3+ open reports from different people drop out of Discover automatically.
-- ─────────────────────────────────────────────────────────────
create type public.report_reason as enum ('spam', 'harassment', 'inappropriate', 'impersonation', 'other');
create type public.report_status as enum ('open', 'actioned', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_user uuid references public.profiles (id) on delete cascade,
  target_circle uuid references public.circles (id) on delete cascade,
  nudge_id uuid references public.nudges (id) on delete set null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 500),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  check (target_user is not null or target_circle is not null)
);
create index reports_open_idx on public.reports (status, created_at desc);
create unique index reports_once_per_target on public.reports (reporter, coalesce(target_user, target_circle), coalesce(nudge_id, '00000000-0000-0000-0000-000000000000'::uuid));
alter table public.reports enable row level security;
revoke all on public.reports from anon;
grant select, insert on public.reports to authenticated;
create policy "reports: file as self" on public.reports
  for insert to authenticated
  with check (reporter = (select auth.uid()) and status = 'open');
create policy "reports: read own" on public.reports
  for select to authenticated
  using (reporter = (select auth.uid()));

create or replace function private.public_circles()
returns table (
  id uuid, name text, color text, code text, focus text, description text,
  member_count int, joined boolean, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  return query
  select c.id, c.name, c.color, c.code, c.focus, c.description,
    (select count(*) from public.circle_members cm where cm.circle_id = c.id)::int,
    exists (select 1 from public.circle_members cm where cm.circle_id = c.id and cm.user_id = (select auth.uid())),
    c.created_at
  from public.circles c
  where c.visibility = 'public'
    and (select count(distinct r.reporter) from public.reports r where r.target_circle = c.id and r.status = 'open') < 3
    and not private.is_blocked((select auth.uid()), c.created_by)
  order by 7 desc, c.created_at desc
  limit 100;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Hijri date offset for local moon sighting (−2…+2 days).
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column hijri_offset smallint not null default 0 check (hijri_offset between -2 and 2);

-- ─────────────────────────────────────────────────────────────
-- Server-sent reminders. The app uploads the next ~30 days; a cron job
-- pushes whatever is due, so reminders keep coming even if the app isn't opened.
-- ─────────────────────────────────────────────────────────────
create table public.scheduled_pushes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  key text not null check (char_length(key) <= 80),
  send_at timestamptz not null,
  kind text not null check (kind in ('at', 'before', 'jumuah', 'fast', 'recap')),
  title text not null check (char_length(title) <= 120),
  body text not null check (char_length(body) <= 240),
  data jsonb not null default '{}',
  silent boolean not null default false,
  sent_at timestamptz,
  primary key (user_id, key)
);
create index scheduled_pushes_due_idx on public.scheduled_pushes (send_at) where sent_at is null;
alter table public.scheduled_pushes enable row level security;
revoke all on public.scheduled_pushes from anon;
grant select, insert, update, delete on public.scheduled_pushes to authenticated;
create policy "scheduled_pushes: owner" on public.scheduled_pushes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and sent_at is null);

-- Old voice notes (for the daily cleanup job; service role only).
create or replace function public.voice_notes_older_than(days int)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select name from storage.objects
  where bucket_id = 'voice-notes' and created_at < now() - make_interval(days => days)
  limit 1000;
$$;
revoke all on function public.voice_notes_older_than(int) from public, anon, authenticated;
grant execute on function public.voice_notes_older_than(int) to service_role;

-- Weekly recap numbers for one user (service role only).
create or replace function public.week_recap(uid uuid, since date)
returns table (prayed int, on_time int, jamaah int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where l.status <> 'missed')::int,
    count(*) filter (where l.status = 'on_time')::int,
    count(d.log_id) filter (where d.in_jamaah)::int
  from public.prayer_logs l
  left join public.prayer_log_details d on d.log_id = l.id
  where l.user_id = uid and l.prayed_on >= since;
$$;
revoke all on function public.week_recap(uuid, date) from public, anon, authenticated;
grant execute on function public.week_recap(uuid, date) to service_role;
