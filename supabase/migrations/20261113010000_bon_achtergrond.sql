-- Bon uitlezen op de achtergrond: 'reading' = Claude is nog bezig; 'read_note' = opmerking of foutmelding van het uitlezen.
alter table receipts add column if not exists reading boolean not null default false;
alter table receipts add column if not exists read_note text check (length(read_note) <= 400);
