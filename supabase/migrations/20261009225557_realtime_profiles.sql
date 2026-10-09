-- Circle-mates see "Paused" and profile changes live. RLS still limits rows to people you share a circle with.
alter publication supabase_realtime add table public.profiles;
