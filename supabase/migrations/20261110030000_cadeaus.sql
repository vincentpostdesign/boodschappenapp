-- Cadeaulijst (Beheer): ideeën en aankopen voor Sinterklaas, kerst, verjaardagen.
-- 'geheim' = alleen zichtbaar voor wie het toevoegde (verrassing voor de ander).
create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  recipient text check (length(recipient) <= 60),
  occasion text not null default 'sint' check (occasion in ('sint', 'kerst', 'verjaardag', 'overig')),
  price numeric(8, 2) check (price >= 0 and price < 100000),
  link text check (length(link) <= 500),
  note text check (length(note) <= 300),
  bought boolean not null default false,
  secret boolean not null default false,
  added_by text not null references people(id),
  created_at timestamptz not null default now()
);
create index if not exists gifts_occasion_idx on gifts (occasion, bought);

alter table gifts enable row level security;
grant all on gifts to service_role;
