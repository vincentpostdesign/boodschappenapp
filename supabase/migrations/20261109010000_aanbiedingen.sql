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
