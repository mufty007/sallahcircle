-- DiceBear "Fun Emoji" avatar seed (null = use the user id, so everyone has a stable default).
alter table public.profiles add column avatar_seed text check (char_length(avatar_seed) <= 40);
