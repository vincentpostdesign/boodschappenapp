-- Watchlist: tweede foto (streepjescode) en een officiële productafbeelding van internet (Open Food/Products Facts).
alter table watchlist_items add column if not exists barcode_path text check (length(barcode_path) <= 200);
alter table watchlist_items add column if not exists image_url text check (length(image_url) <= 500);
