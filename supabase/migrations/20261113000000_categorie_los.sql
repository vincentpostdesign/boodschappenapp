-- Losse producten op de lijst indelen in een afdeling.
-- list_items.category: soort product (zie src/lib/categories.ts), gezet door Claude of met de hand.
-- category_memory: onthoudt per naam de gekozen soort, zodat hetzelfde product de volgende keer meteen goed staat.
alter table list_items add column if not exists category text check (length(category) <= 30);
create table if not exists category_memory (
  name text primary key check (length(name) <= 120),
  category text not null check (length(category) <= 30),
  source text not null default 'claude' check (source in ('claude', 'hand')),
  updated_at timestamptz not null default now()
);
alter table category_memory enable row level security;
grant all on category_memory to service_role;
