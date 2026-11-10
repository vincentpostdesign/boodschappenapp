-- Alleen de server (service_role) krijgt rechten op de tabellen. De openbare rollen (anon, authenticated) niet.
-- Nodig op projecten waar "Automatically expose new tables" uit staat.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
