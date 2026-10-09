-- Streaks for yourself and circle-mates, computed server-side so excused days can be skipped
-- without ever revealing which days they were.

create or replace function private.member_streaks(uids uuid[])
returns table (user_id uuid, streak int)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid;
  tz text;
  d date;
  n int;
  s int;
begin
  foreach uid in array uids loop
    continue when uid <> (select auth.uid()) and not private.shares_circle_with(uid);

    select coalesce(p.timezone, 'UTC') into tz from public.profiles p where p.id = uid;
    d := (now() at time zone tz)::date;
    s := 0;

    -- Today is still in progress: start from yesterday unless today is complete.
    select count(*) into n from public.prayer_logs l where l.user_id = uid and l.prayed_on = d and l.status <> 'missed';
    if n < 5 then d := d - 1; end if;

    for i in 1..1000 loop
      select count(*) into n from public.prayer_logs l where l.user_id = uid and l.prayed_on = d and l.status <> 'missed';
      if n >= 5 then
        s := s + 1;
      elsif not exists (
        select 1 from public.excused_periods e
        where e.user_id = uid and e.started_on <= d and (e.ended_on is null or e.ended_on >= d)
      ) then
        exit;
      end if;
      d := d - 1;
    end loop;

    user_id := uid;
    streak := s;
    return next;
  end loop;
end;
$$;
revoke all on function private.member_streaks(uuid[]) from public;
grant execute on function private.member_streaks(uuid[]) to authenticated;

create or replace function public.member_streaks(uids uuid[])
returns table (user_id uuid, streak int)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.member_streaks(uids); $$;
revoke all on function public.member_streaks(uuid[]) from public, anon;
grant execute on function public.member_streaks(uuid[]) to authenticated;
