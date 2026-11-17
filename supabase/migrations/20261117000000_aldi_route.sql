-- Looproute Aldi zoals Vincent en Marleen hem lopen (17 november 2026).
-- 'Vleeswaren kaas en zuivel' wordt Vleeswaren + Kaas + Zuivel; Vlees heet 'Vlees (bakvlees)';
-- Frisdrank wordt een eigen groep naast 'Bier, wijn, noten en chips'.
-- Vaste artikelen die bij de Aldi al een afdeling hadden gaan mee naar de nieuwe afdelingen.
do $$
declare
  volgorde text[] := array['Groente en fruit','Salades','Vis','Brood en zoetwaren','Koffie','Thee','Bier, wijn, noten en chips','Frisdrank',
                           'Vlees (bakvlees)','Vleeswaren','Kaas','Zuivel','Diepvries','Overig'];
  oud uuid;
  i int;
begin
  select id into oud from departments where store_id = 'aldi' and name = 'Vleeswaren kaas en zuivel';
  update departments set name = 'Vlees (bakvlees)' where store_id = 'aldi' and name = 'Vlees';
  update departments set name = 'Bier, wijn, noten en chips' where store_id = 'aldi' and name = 'Bier wijn noten en chips';
  update departments set name = 'Vleeswaren' where store_id = 'aldi' and name = 'Vleeswaren kaas en zuivel';
  insert into departments (store_id, name, sort_order)
    select 'aldi', n, 100 from unnest(array['Kaas','Zuivel','Frisdrank']) n
    where not exists (select 1 from departments where store_id = 'aldi' and name = n);
  for i in 1 .. array_length(volgorde, 1) loop
    update departments set sort_order = i where store_id = 'aldi' and name = volgorde[i];
  end loop;

  -- Vaste artikelen uit het oude blok verdelen: kaas → Kaas, vleeswaren blijven, de rest → Zuivel.
  if oud is not null then
    update product_store_department m set department_id = (select id from departments where store_id = 'aldi' and name = 'Kaas')
      from products p where p.id = m.product_id and m.store_id = 'aldi' and m.department_id = oud
       and p.name ~* '(kaas|gouda|brie|mozzarella|parmezaan|feta|cheddar)' and p.name !~* 'pindakaas';
    update product_store_department m set department_id = (select id from departments where store_id = 'aldi' and name = 'Zuivel')
      from products p where p.id = m.product_id and m.store_id = 'aldi' and m.department_id = oud
       and p.name !~* '(vleeswaren|ham\M|salami|rookvlees|worst|filet american|pate\M)';
  end if;
  -- Frisdrank, siroop en sap naar de nieuwe groep Frisdrank.
  update product_store_department m set department_id = (select id from departments where store_id = 'aldi' and name = 'Frisdrank')
    from products p where p.id = m.product_id and m.store_id = 'aldi'
     and m.department_id = (select id from departments where store_id = 'aldi' and name = 'Bier, wijn, noten en chips')
     and p.name ~* '(cola|fanta|sprite|siroop|limonade|ranja|frisdrank|sap\M|ice ?tea|tonic|water\M|spa\M)';
end $$;

-- Vaste artikelen die verkeerd of nergens stonden, in alle winkels:
-- boomstam is bakvlees, caesar-slaschotel een salade, croissants uit de vriezer diepvries, plakjes grillworst vleeswaren.
do $$
declare
  r record;
begin
  for r in
    select p.id pid, s.id sid,
      (select d.id from departments d where d.store_id = s.id and (
         (p.name ~* 'boomstam' and d.name ~* '^vlees' and d.name !~* '^vleeswaren')
      or (p.name ~* '(caesar|slasch)' and d.name ~* 'salade')
      or (p.name ~* 'vriezer' and d.name ~* 'diepvries')
      or (p.name ~* 'grillworst' and d.name ~* '^vleeswaren'))
       order by d.sort_order limit 1) did
    from products p cross join stores s
    where p.name ~* '(boomstam|caesar|slasch|vriezer|grillworst)'
  loop
    if r.did is not null then
      insert into product_store_department (product_id, store_id, department_id) values (r.pid, r.sid, r.did)
        on conflict (product_id, store_id) do update set department_id = excluded.department_id;
    end if;
  end loop;
end $$;

-- Claude had 'boomstammetje' als zoetwaren onthouden; het is bakvlees.
update category_memory set category = 'vlees', source = 'hand' where name like 'boomstam%';
