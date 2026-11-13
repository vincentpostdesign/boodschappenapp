-- Product is niet te koop bij een winkel (bijv. opschuimmelk niet bij de Aldi).
-- Per productnaam (genormaliseerd), zodat het ook geldt voor losse regels en de volgende keer.
create table if not exists store_unavailable (
  name text not null check (length(name) between 1 and 120),
  store_id text not null references stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (name, store_id)
);
alter table store_unavailable enable row level security;
grant all on store_unavailable to service_role;
