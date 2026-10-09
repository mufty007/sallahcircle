-- Circle management: owners remove members and reset invite codes; ownership passes on when the owner leaves.

-- Members leave themselves; the owner can remove anyone else.
drop policy if exists "circle_members: leave" on public.circle_members;
create policy "circle_members: leave or owner removes" on public.circle_members
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.circles c
      where c.id = circle_members.circle_id and c.created_by = (select auth.uid()) and circle_members.user_id <> c.created_by
    )
  );

-- New invite code (old one stops working).
create or replace function private.reset_circle_code(cid uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  new_code text;
begin
  update public.circles set code = private.gen_code()
  where id = cid and created_by = (select auth.uid())
  returning code into new_code;
  if new_code is null then
    raise exception 'Only the circle owner can reset the code' using errcode = '42501';
  end if;
  return new_code;
end;
$$;
revoke all on function private.reset_circle_code(uuid) from public;
grant execute on function private.reset_circle_code(uuid) to authenticated;

create or replace function public.reset_circle_code(cid uuid)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$ select private.reset_circle_code(cid); $$;
revoke all on function public.reset_circle_code(uuid) from public, anon;
grant execute on function public.reset_circle_code(uuid) to authenticated;

-- When the owner leaves, the earliest-joined member takes over; an empty circle is deleted.
create or replace function private.handle_member_left()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  heir uuid;
begin
  select created_by into owner from public.circles where id = old.circle_id;
  if not found then
    return old; -- the circle itself is being deleted
  end if;

  select user_id into heir from public.circle_members
  where circle_id = old.circle_id
  order by joined_at, user_id
  limit 1;

  if heir is null then
    delete from public.circles where id = old.circle_id;
  elsif owner = old.user_id then
    update public.circles set created_by = heir where id = old.circle_id;
    update public.circle_members set role = 'owner' where circle_id = old.circle_id and user_id = heir;
  end if;
  return old;
end;
$$;
drop trigger if exists on_member_left on public.circle_members;
create trigger on_member_left
  after delete on public.circle_members
  for each row execute function private.handle_member_left();
