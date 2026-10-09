-- Nudges respect the circle's "nudges enabled" switch and the recipient's "let my circle nudge me" setting.
-- reminder_settings is owner-only, so the check runs as definer in the private schema.
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
    and coalesce((select s.allow_nudges from public.reminder_settings s where s.user_id = recipient), true);
$$;
revoke all on function private.can_nudge(uuid, uuid) from public;
grant execute on function private.can_nudge(uuid, uuid) to authenticated;

drop policy "nudges: send within a shared circle" on public.nudges;
create policy "nudges: send within a shared circle" on public.nudges
  for insert to authenticated
  with check (from_user = (select auth.uid()) and private.can_nudge(circle_id, to_user));
