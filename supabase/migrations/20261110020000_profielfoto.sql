-- Profielfoto per persoon (zoals in pot-laden). Het bestand staat privé in bucket 'fotos' onder personen/.
alter table people add column if not exists avatar_path text check (length(avatar_path) <= 200);
