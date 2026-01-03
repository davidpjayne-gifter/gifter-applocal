alter table public.seasons
  add column if not exists goal_date date;

alter table public.seasons
  add column if not exists goal_date_set_at timestamptz;
