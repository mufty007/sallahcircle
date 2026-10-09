-- Keep jamāʿah / masjid details private in an owner-only table. Column-level
-- grants on prayer_logs blocked upserts, so prayer_logs now holds only what
-- circle-mates may see (the status), and the details live here.
create table public.prayer_log_details (
  log_id uuid primary key references public.prayer_logs (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  in_jamaah boolean not null default false,
  at_masjid boolean not null default false
);
create index prayer_log_details_user_idx on public.prayer_log_details (user_id);

insert into public.prayer_log_details (log_id, user_id, in_jamaah, at_masjid)
select id, user_id, in_jamaah, at_masjid from public.prayer_logs;

alter table public.prayer_logs drop column in_jamaah, drop column at_masjid;

revoke all on public.prayer_logs from anon, authenticated;
grant select, insert, update, delete on public.prayer_logs to authenticated;

revoke all on public.prayer_log_details from anon, authenticated;
grant select, insert, update, delete on public.prayer_log_details to authenticated;
alter table public.prayer_log_details enable row level security;

create policy "prayer_log_details: owner" on public.prayer_log_details
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.prayer_logs l where l.id = log_id and l.user_id = (select auth.uid()))
  );
