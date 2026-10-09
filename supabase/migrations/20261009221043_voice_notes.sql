-- Voice nudges: short recordings in a private bucket, stored under the sender's folder.
-- voice-notes/{sender_id}/{uuid}.m4a — readable by the sender and by whoever the nudge was sent to.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-notes', 'voice-notes', false, 1048576, array['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/webm'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Recipient check reads nudges regardless of the caller's RLS, so it lives in private.
create or replace function private.can_hear_voice(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.nudges n
    where n.voice_path = object_name and n.to_user = (select auth.uid())
  );
$$;
revoke all on function private.can_hear_voice(text) from public;
grant execute on function private.can_hear_voice(text) to authenticated;

create policy "voice-notes: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'voice-notes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "voice-notes: sender or recipient reads" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'voice-notes'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.can_hear_voice(name))
  );

create policy "voice-notes: sender deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'voice-notes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- A voice nudge must point at a file in the sender's own folder.
alter table public.nudges add constraint nudges_voice_path_check
  check (
    (kind = 'voice' and voice_path is not null and voice_path like from_user::text || '/%')
    or (kind <> 'voice' and voice_path is null)
  );
