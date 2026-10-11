-- Let someone set how many excused days they expect, and keep going past that if they choose.
-- A morning reminder fires when the length passes (even while prayer reminders are paused).

alter table public.excused_periods
  add column expected_days smallint,
  add column continued boolean not null default false;

alter table public.excused_periods
  add constraint excused_periods_expected_days_range
  check (expected_days is null or expected_days between 1 and 60);

-- Closed and open periods can't cover the same days.
create or replace function private.excused_no_overlap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.excused_periods e
    where e.user_id = new.user_id
      and e.id is distinct from new.id
      and daterange(e.started_on, coalesce(e.ended_on, 'infinity'::date), '[]')
        && daterange(new.started_on, coalesce(new.ended_on, 'infinity'::date), '[]')
  ) then
    raise exception 'These dates overlap another excused period.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.excused_no_overlap() from public;
grant execute on function private.excused_no_overlap() to authenticated;

create trigger excused_periods_no_overlap
  before insert or update of started_on, ended_on on public.excused_periods
  for each row execute function private.excused_no_overlap();

-- The length reminder is a scheduled push, and it has to go out while the person is paused.
do $$
declare c name;
begin
  select con.conname into c
  from pg_constraint con
  where con.conrelid = 'public.scheduled_pushes'::regclass
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%recap%';
  if c is not null then
    execute format('alter table public.scheduled_pushes drop constraint %I', c);
  end if;
end $$;

alter table public.scheduled_pushes
  add constraint scheduled_pushes_kind_check
  check (kind in ('at', 'before', 'jumuah', 'fast', 'recap', 'excused'));

create or replace function public.claim_due_pushes(max_rows int default 500)
returns setof public.scheduled_pushes
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.scheduled_pushes where send_at < now() - interval '2 days';
  return query
  update public.scheduled_pushes s
  set sent_at = now()
  where (s.user_id, s.key) in (
    select p.user_id, p.key
    from public.scheduled_pushes p
    join public.profiles pr on pr.id = p.user_id
    where p.sent_at is null
      and p.send_at <= now()
      and p.send_at > now() - interval '15 minutes'
      and (pr.paused_since is null or p.kind in ('recap', 'excused'))
    order by p.send_at
    limit max_rows
    for update of p skip locked
  )
  returning s.*;
end;
$$;

revoke all on function public.claim_due_pushes(int) from public, anon, authenticated;
grant execute on function public.claim_due_pushes(int) to service_role;
