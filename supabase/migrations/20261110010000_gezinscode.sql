-- Mislukte pogingen om de gezinscode in te voeren (tegen raden). De code zelf staat gehasht in settings ('toegangscode').
create table access_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index access_attempts_ip_at on access_attempts (ip, at);
alter table access_attempts enable row level security;
grant all on access_attempts to service_role;
