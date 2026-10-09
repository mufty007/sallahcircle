-- Prayer times come from the AlAdhan API (https://aladhan.com/prayer-times-api).
-- Store its numeric calculation method id directly instead of our own enum.
alter table public.profiles alter column calc_method drop default;
alter table public.profiles
  alter column calc_method type smallint using 2,
  alter column calc_method set default 2;
alter table public.profiles
  add constraint profiles_calc_method_check check (calc_method between 0 and 23);
drop type public.calc_method;

comment on column public.profiles.calc_method is 'AlAdhan method id (e.g. 2 = ISNA, 3 = MWL, 4 = Umm al-Qura, 5 = Egyptian)';
comment on column public.profiles.asr_method is 'AlAdhan school: standard = 0 (Shafiʿi, Maliki, Hanbali), hanafi = 1';
