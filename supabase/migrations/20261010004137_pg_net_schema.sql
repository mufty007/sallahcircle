-- Keep pg_net out of the public schema (security advisor). Its functions live in the net schema either way.
drop extension if exists pg_net;
create extension pg_net with schema extensions;
