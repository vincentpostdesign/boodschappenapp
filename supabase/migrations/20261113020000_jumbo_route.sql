-- Looproute Jumbo zoals Vincent en Marleen hem lopen (13 november 2026).
-- Noten en chips → Chips, Bier en wijn → Bieren (+ Wijnen), Zoetwaren → Koekjes; Ontbijt-producten naar Koekjes;
-- Vlees, Ontbijt, Koffie, Thee en Kaas vervallen; Kruiden, Soepen, Frisdranken en Houdbare zuivel erbij.
do $$
declare
  volgorde text[] := array['Groente en fruit','Salades','Vis','Kruiden','Soepen','Chips','Bieren','Wijnen','Frisdranken','Houdbare zuivel','Koekjes','Zuivel','Diepvries','Brood','Vleeswaren','Overig'];
  koek uuid;
  i int;
begin
  update departments set name = 'Chips' where store_id = 'jumbo' and name = 'Noten en chips';
  update departments set name = 'Bieren' where store_id = 'jumbo' and name = 'Bier en wijn';
  update departments set name = 'Koekjes' where store_id = 'jumbo' and name = 'Zoetwaren';
  select id into koek from departments where store_id = 'jumbo' and name = 'Koekjes';
  update product_store_department set department_id = koek
   where store_id = 'jumbo' and department_id in (select id from departments where store_id = 'jumbo' and name = 'Ontbijt');
  delete from departments where store_id = 'jumbo' and name in ('Vlees','Ontbijt','Koffie','Thee','Kaas');
  insert into departments (store_id, name, sort_order)
    select 'jumbo', n, 100 from unnest(array['Kruiden','Soepen','Wijnen','Frisdranken','Houdbare zuivel']) n
    where not exists (select 1 from departments where store_id = 'jumbo' and name = n);
  for i in 1 .. array_length(volgorde, 1) loop
    update departments set sort_order = i where store_id = 'jumbo' and name = volgorde[i];
  end loop;
end $$;
