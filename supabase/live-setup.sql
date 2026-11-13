-- Eenmalige opzet van een nieuw Supabase-project: alle migraties + startdata.
-- Plakken in Supabase → SQL Editor → Run. Niet opnieuw draaien op een gevuld project.

-- ===== supabase/migrations/20261109000000_basis.sql =====
-- Basisschema boodschappen-app (Vincent en Marleen)
-- Alle toegang loopt via de server (service-role); RLS staat aan zonder publieke policies.

create extension if not exists pgcrypto;

create table people (
  id text primary key,                 -- 'vincent', 'marleen'
  name text not null,
  initial text not null,
  pin_hash text,                       -- optioneel, null = geen pincode
  created_at timestamptz not null default now()
);

create table stores (
  id text primary key,                 -- 'aldi', 'jumbo', ...
  name text not null,
  is_default boolean not null default false,
  sort_order int not null default 0,
  location text
);
create unique index stores_one_default on stores (is_default) where is_default;

create table departments (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references stores(id) on delete cascade,
  name text not null,
  sort_order int not null,
  unique (store_id, name)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_quantity int not null default 1 check (default_quantity > 0),
  default_store_id text references stores(id),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table product_store_department (
  product_id uuid not null references products(id) on delete cascade,
  store_id text not null references stores(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  primary key (product_id, store_id)
);

create table list_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  name text not null,
  description text,
  quantity int not null default 1 check (quantity > 0),
  store_id text references stores(id),
  department_id uuid references departments(id) on delete set null,
  added_by text not null references people(id),
  added_at timestamptz not null default now(),
  checked boolean not null default false,
  checked_at timestamptz,
  checked_by text references people(id),
  archived boolean not null default false,
  archived_at timestamptz
);
create index list_items_active on list_items (archived, checked);

create table shopper_days (
  day date primary key,
  person_id text not null references people(id),
  notified_at timestamptz,
  reminded_at timestamptz
);

create table watchlist_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  content text,                        -- inhoud, bijv. '30 stuks'
  ean text,
  photo_path text,
  max_price numeric(8,2),              -- prijsgrens
  min_discount_pct int check (min_discount_pct between 0 and 100),
  added_by text references people(id),
  created_at timestamptz not null default now()
);

create table offers_cache (
  id uuid primary key default gen_random_uuid(),
  source text not null,                -- 'prijsprofeet'
  store_id text not null references stores(id),
  external_id text,
  name text not null,
  brand text,
  price numeric(8,2),
  original_price numeric(8,2),
  discount_pct int,
  valid_from date,
  valid_until date,
  fetched_at timestamptz not null default now(),
  unique (source, store_id, external_id)
);

create table watchlist_hits (
  id uuid primary key default gen_random_uuid(),
  watchlist_item_id uuid not null references watchlist_items(id) on delete cascade,
  offer_id uuid not null references offers_cache(id) on delete cascade,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (watchlist_item_id, offer_id)
);

-- Bekende prijzen per product per winkel (uit bonnen of uit de prijsbron)
create table product_prices (
  product_id uuid not null references products(id) on delete cascade,
  store_id text not null references stores(id) on delete cascade,
  price numeric(8,2) not null,
  source text not null,                -- 'bon' of 'prijsprofeet'
  observed_at timestamptz not null default now(),
  primary key (product_id, store_id)
);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  store_id text references stores(id),
  purchased_on date,
  total numeric(8,2),
  photo_path text not null,
  status text not null default 'nieuw' check (status in ('nieuw', 'gecontroleerd')),
  uploaded_by text references people(id),
  created_at timestamptz not null default now()
);

create table receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  line_no int not null,
  raw_name text not null,
  quantity numeric(8,3) not null default 1,
  price numeric(8,2) not null,         -- regelbedrag
  product_id uuid references products(id) on delete set null
);

create table product_aliases (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references stores(id) on delete cascade,
  alias text not null,                 -- naam zoals op de bon
  product_id uuid not null references products(id) on delete cascade,
  unique (store_id, alias)
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  person_id text not null references people(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value jsonb not null
);

-- RLS aan op alles; alleen de service-role (server) mag erbij.
do $$
declare t text;
begin
  foreach t in array array['people','stores','departments','products','product_store_department',
    'list_items','shopper_days','watchlist_items','offers_cache','watchlist_hits','product_prices',
    'receipts','receipt_lines','product_aliases','push_subscriptions','settings']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Opslag voor foto's (bonnetjes en watchlist), privé
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false)
on conflict (id) do nothing;

-- ===== supabase/migrations/20261109010000_aanbiedingen.sql =====
-- Extra velden voor aanbiedingen en de koppeling aan vaste producten.

alter table offers_cache
  add column product_id uuid references products(id) on delete set null,
  add column quantity text,
  add column promo_label text,          -- bijv. '1+1 gratis', '2 voor €2,50', '21% korting'
  add column url text,
  add column image_url text,
  add column status text;               -- 'active' of 'upcoming'

create index offers_cache_product on offers_cache (product_id) where product_id is not null;
create index offers_cache_valid on offers_cache (valid_until);

-- Wie moet een watchlist-melding krijgen: de toevoeger, of iedereen als die leeg is.
alter table watchlist_hits add column bundled boolean not null default false;

-- Laatste verversing bijhouden (voor het scherm en de cron)
insert into settings (key, value) values ('offers_refreshed_at', 'null') on conflict (key) do nothing;

-- ===== supabase/migrations/20261109020000_categorie.sql =====
-- Categorie van de prijsbron (bijv. 'zuivel-eieren'), voor strengere koppeling aan vaste producten.
alter table offers_cache add column category text;

-- ===== supabase/migrations/20261110000000_rechten_server.sql =====
-- Alleen de server (service_role) krijgt rechten op de tabellen. De openbare rollen (anon, authenticated) niet.
-- Nodig op projecten waar "Automatically expose new tables" uit staat.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- ===== supabase/migrations/20261110010000_gezinscode.sql =====
-- Mislukte pogingen om de gezinscode in te voeren (tegen raden). De code zelf staat gehasht in settings ('toegangscode').
create table access_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index access_attempts_ip_at on access_attempts (ip, at);
alter table access_attempts enable row level security;
grant all on access_attempts to service_role;

-- ===== supabase/migrations/20261110020000_profielfoto.sql =====
-- Profielfoto per persoon (zoals in pot-laden). Het bestand staat privé in bucket 'fotos' onder personen/.
alter table people add column if not exists avatar_path text check (length(avatar_path) <= 200);

-- ===== supabase/seed.sql =====
-- Startdata. Draait bij `supabase db reset`.

insert into people (id, name, initial) values
  ('vincent', 'Vincent', 'V'),
  ('marleen', 'Marleen', 'M');

insert into stores (id, name, is_default, sort_order, location) values
  ('aldi',  'Aldi',         true,  1, 'Harderwijk'),
  ('jumbo', 'Jumbo',        false, 2, 'Harderwijk'),
  ('plus',  'Plus',         false, 3, 'Ermelo'),
  ('ah',    'Albert Heijn', false, 4, 'Ermelo'),
  ('lidl',  'Lidl',         false, 5, 'Ermelo');

-- Afdelingen Aldi (looproute)
insert into departments (store_id, name, sort_order)
select 'aldi', name, ord from unnest(array[
  'Groente en fruit', 'Salades', 'Vis', 'Vlees', 'Brood en zoetwaren', 'Koffie', 'Thee',
  'Bier wijn noten en chips', 'Vleeswaren kaas en zuivel', 'Diepvries', 'Overig'
]) with ordinality as t(name, ord);

-- Afdelingen Jumbo: looproute nog onbekend, voorlopige indeling (aanpasbaar in Beheer)
insert into departments (store_id, name, sort_order)
select 'jumbo', name, ord from unnest(array[
  'Groente en fruit', 'Salades', 'Vis', 'Vlees', 'Brood', 'Ontbijt', 'Zoetwaren', 'Koffie', 'Thee',
  'Bier en wijn', 'Noten en chips', 'Vleeswaren', 'Kaas', 'Zuivel', 'Diepvries', 'Overig'
]) with ordinality as t(name, ord);

-- Plus, Albert Heijn, Lidl: voorlopig dezelfde indeling als de Aldi
insert into departments (store_id, name, sort_order)
select s.id, d.name, d.sort_order
from stores s cross join departments d
where s.id in ('plus', 'ah', 'lidl') and d.store_id = 'aldi';

-- Vaste producten
with p(name, description, aldi_dep, jumbo_dep) as (values
  ('Kwark',          'Magere kwark, 500 ml',                       'Vleeswaren kaas en zuivel', 'Zuivel'),
  ('Melk',           'Halfvolle melk, 2 liter',                    'Vleeswaren kaas en zuivel', 'Zuivel'),
  ('Yoghurt',        'Optimel, framboos of passievrucht, 1 liter', 'Vleeswaren kaas en zuivel', 'Zuivel'),
  ('Gorgonzola',     '1 pak',                                      'Vleeswaren kaas en zuivel', 'Zuivel'),
  ('Crème fraîche',  'Eigen merk',                                 'Vleeswaren kaas en zuivel', 'Zuivel'),
  ('Room',           'Roompakje, vers, eigen merk',                'Vleeswaren kaas en zuivel', 'Zuivel'),
  ('Volkorenbrood',  'Heel',                                       'Brood en zoetwaren',        'Brood'),
  ('Volkorenbrood',  'Tijger',                                     'Brood en zoetwaren',        'Brood'),
  ('Salade',         'Caesar salad',                               'Salades',                   'Salades'),
  ('Salade',         'Boerensalade',                               'Salades',                   'Salades'),
  ('Bananen',        null,                                         'Groente en fruit',          'Groente en fruit'),
  ('Kiwi''s',        null,                                         'Groente en fruit',          'Groente en fruit'),
  ('Druiven',        null,                                         'Groente en fruit',          'Groente en fruit'),
  ('Muesli',         null,                                         'Bier wijn noten en chips',  'Ontbijt'),
  ('Walnoten',       'Gewoon',                                     'Bier wijn noten en chips',  'Noten en chips'),
  ('Cashewnoten',    'Gebrand, ongezouten',                        'Bier wijn noten en chips',  'Noten en chips')
), ins as (
  insert into products (name, description, default_store_id)
  select name, description, 'aldi' from p
  returning id, name, description
)
insert into product_store_department (product_id, store_id, department_id)
select ins.id, d.store_id, d.id
from ins
join p on p.name = ins.name and p.description is not distinct from ins.description
join departments d on
     (d.store_id = 'aldi'  and d.name = p.aldi_dep)
  or (d.store_id = 'jumbo' and d.name = p.jumbo_dep)
  or (d.store_id in ('plus', 'ah', 'lidl') and d.name = p.aldi_dep);

-- Watchlist
insert into watchlist_items (name, brand) values
  ('Wasmiddelpods', 'Lenor'),
  ('Wc-papier', null),
  ('Afwasmiddel', null),
  ('Vaatwastabletten', null);

insert into settings (key, value) values
  ('pin_required', 'false'),
  ('watchlist_notify', '"direct"');

-- ===== supabase/migrations/20261110030000_cadeaus.sql =====
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

-- ===== supabase/migrations/20261111000000_watchlist_fotos.sql =====
-- Watchlist: tweede foto (streepjescode) en een officiële productafbeelding van internet (Open Food/Products Facts).
alter table watchlist_items add column if not exists barcode_path text check (length(barcode_path) <= 200);
alter table watchlist_items add column if not exists image_url text check (length(image_url) <= 500);

-- ===== supabase/migrations/20261113000000_categorie_los.sql =====
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

-- ===== supabase/migrations/20261113010000_bon_achtergrond.sql =====
-- Bon uitlezen op de achtergrond: 'reading' = Claude is nog bezig; 'read_note' = opmerking of foutmelding van het uitlezen.
alter table receipts add column if not exists reading boolean not null default false;
alter table receipts add column if not exists read_note text check (length(read_note) <= 400);
