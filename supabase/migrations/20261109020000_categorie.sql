-- Categorie van de prijsbron (bijv. 'zuivel-eieren'), voor strengere koppeling aan vaste producten.
alter table offers_cache add column category text;
