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
