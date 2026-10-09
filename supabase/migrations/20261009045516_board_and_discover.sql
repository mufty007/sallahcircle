-- Weekly leaderboard and public-circle discovery.
-- Both need aggregates over rows the caller can't read directly (others'
-- jamāʿah details, member counts of circles they haven't joined), so the
-- SECURITY DEFINER work lives in `private` and only returns aggregates.

-- Points per member of a circle since `since`: on time 3, late 1, jamāʿah +1.
create or replace function private.circle_board(cid uuid, since date)
returns table (user_id uuid, on_time int, late int, jamaah int, points int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_circle_member(cid) then
    raise exception 'not a member of this circle' using errcode = '42501';
  end if;
  return query
  select
    m.user_id,
    (count(l.id) filter (where l.status = 'on_time'))::int,
    (count(l.id) filter (where l.status = 'late'))::int,
    (count(d.log_id) filter (where d.in_jamaah))::int,
    (3 * count(l.id) filter (where l.status = 'on_time')
      + count(l.id) filter (where l.status = 'late')
      + count(d.log_id) filter (where d.in_jamaah))::int
  from public.circle_members m
  left join public.prayer_logs l on l.user_id = m.user_id and l.prayed_on >= since
  left join public.prayer_log_details d on d.log_id = l.id
  where m.circle_id = cid
  group by m.user_id;
end;
$$;

-- Public circles with member counts and whether the caller has joined.
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
  order by 7 desc, c.created_at desc
  limit 100;
end;
$$;

revoke all on function private.circle_board(uuid, date) from public;
revoke all on function private.public_circles() from public;
grant execute on function private.circle_board(uuid, date) to authenticated;
grant execute on function private.public_circles() to authenticated;

create or replace function public.circle_board(cid uuid, since date)
returns table (user_id uuid, on_time int, late int, jamaah int, points int)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.circle_board(cid, since); $$;

create or replace function public.public_circles()
returns table (
  id uuid, name text, color text, code text, focus text, description text,
  member_count int, joined boolean, created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.public_circles(); $$;

revoke all on function public.circle_board(uuid, date) from public, anon;
revoke all on function public.public_circles() from public, anon;
grant execute on function public.circle_board(uuid, date) to authenticated;
grant execute on function public.public_circles() to authenticated;
