-- Kilometres or miles for distances (null = pick from the country: miles in the US, UK, Liberia and Myanmar).
alter table public.profiles add column distance_unit text check (distance_unit in ('km', 'mi'));
