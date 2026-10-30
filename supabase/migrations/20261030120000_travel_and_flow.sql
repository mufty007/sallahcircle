-- Traveling flag + jamʿ (combined) prayer detail + optional flow intensity for excused periods.

alter table public.profiles
  add column if not exists traveling boolean not null default false;

alter table public.prayer_log_details
  add column if not exists combined boolean not null default false;

-- Flow intensity per day within a private excused period (owner-only).
do $$ begin
  create type public.flow_intensity as enum ('light', 'medium', 'heavy');
exception when duplicate_object then null;
end $$;

create table if not exists public.excused_flow_days (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.excused_periods (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  on_date date not null,
  flow public.flow_intensity not null,
  note text,
  created_at timestamptz not null default now(),
  unique (period_id, on_date)
);

create index if not exists excused_flow_days_user_date_idx on public.excused_flow_days (user_id, on_date);

alter table public.excused_flow_days enable row level security;

drop policy if exists excused_flow_days_owner on public.excused_flow_days;
create policy excused_flow_days_owner on public.excused_flow_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
