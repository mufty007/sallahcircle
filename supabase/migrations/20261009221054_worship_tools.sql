-- Personal worship tools: qaḍāʾ counts, fast log, sunnah log, and reminder switches. All owner-only.

create type public.qada_item as enum ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'fast');
create type public.fast_kind as enum ('ramadan', 'qada', 'sunnah', 'nafl');
create type public.sunnah_kind as enum ('fajr_before', 'dhuhr_before', 'dhuhr_after', 'maghrib_after', 'isha_after', 'witr', 'duha', 'tahajjud');

create table public.qada_counts (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item public.qada_item not null,
  owed int not null default 0 check (owed >= 0),
  made_up int not null default 0 check (made_up >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, item)
);

create table public.fast_logs (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  fasted_on date not null,
  kind public.fast_kind not null,
  created_at timestamptz not null default now(),
  primary key (user_id, fasted_on)
);

create table public.sunnah_logs (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  prayed_on date not null,
  kind public.sunnah_kind not null,
  created_at timestamptz not null default now(),
  primary key (user_id, prayed_on, kind)
);

alter table public.qada_counts enable row level security;
alter table public.fast_logs enable row level security;
alter table public.sunnah_logs enable row level security;
revoke all on public.qada_counts, public.fast_logs, public.sunnah_logs from anon;
grant select, insert, update, delete on public.qada_counts, public.fast_logs, public.sunnah_logs to authenticated;

create policy "qada_counts: owner" on public.qada_counts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "fast_logs: owner" on public.fast_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "sunnah_logs: owner" on public.sunnah_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger qada_counts_touch before update on public.qada_counts
  for each row execute function private.touch_updated_at();

-- Logging (or un-logging) a qaḍāʾ fast counts it as made up. Runs as the caller, under their RLS.
create or replace function private.count_qada_fast()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.kind = 'qada' and (tg_op = 'INSERT' or old.kind <> 'qada') then
    insert into public.qada_counts (user_id, item, made_up) values (new.user_id, 'fast', 1)
    on conflict (user_id, item) do update set made_up = public.qada_counts.made_up + 1;
  end if;
  if tg_op in ('DELETE', 'UPDATE') and old.kind = 'qada' and (tg_op = 'DELETE' or new.kind <> 'qada') then
    update public.qada_counts set made_up = greatest(made_up - 1, 0) where user_id = old.user_id and item = 'fast';
  end if;
  return null;
end;
$$;
grant execute on function private.count_qada_fast() to authenticated;
create trigger fast_logs_count_qada
  after insert or update or delete on public.fast_logs
  for each row execute function private.count_qada_fast();

alter table public.reminder_settings
  add column fasting_reminders boolean not null default false,
  add column jumuah_reminder boolean not null default true;
