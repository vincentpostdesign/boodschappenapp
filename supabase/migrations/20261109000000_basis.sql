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
