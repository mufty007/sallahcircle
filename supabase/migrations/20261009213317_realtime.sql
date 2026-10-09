-- Live updates in the app: nudges, circle-mates' prayer logs and membership changes.
-- Realtime applies each subscriber's RLS select policies, so people only receive rows they can already read.
alter publication supabase_realtime add table public.nudges, public.prayer_logs, public.circle_members;
