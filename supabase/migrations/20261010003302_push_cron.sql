-- Cron: every minute the `cron` Edge Function sends due reminders; daily it removes old voice notes.
-- The function URL and a shared secret live in Vault (created outside migrations, never committed):
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<random>', 'cron_secret');   -- same value as the function's CRON_SECRET

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Atomically claim due reminders (skipping paused people) and tidy up old rows.
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
      and (pr.paused_since is null or p.kind = 'recap')
    order by p.send_at
    limit max_rows
    for update of p skip locked
  )
  returning s.*;
end;
$$;
revoke all on function public.claim_due_pushes(int) from public, anon, authenticated;
grant execute on function public.claim_due_pushes(int) to service_role;

create or replace function private.invoke_cron(task text)
returns bigint
language sql
volatile
security definer
set search_path = ''
as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('task', task),
    timeout_milliseconds := 25000
  );
$$;
revoke all on function private.invoke_cron(text) from public;

select cron.schedule('send-due-pushes', '* * * * *', $$ select private.invoke_cron('due'); $$);
select cron.schedule('cleanup-voice-notes', '17 3 * * *', $$ select private.invoke_cron('cleanup'); $$);
