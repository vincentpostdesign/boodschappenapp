import { requirePerson } from "@/lib/session";
import { getActiveItems, getActiveStore, getDepartments, getProductDepartments, getProducts, getUnavailable, getBoughtAt } from "@/lib/data";
import { groupByRoute, normalize } from "@/lib/route";
import { NOT_HERE, onlyBoughtElsewhere } from "@/lib/not-here";
import { FixedProducts } from "@/components/FixedProducts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vaste producten · Boodschappen" };

export default async function VastPage() {
  await requirePerson();
  const { store } = await getActiveStore();
  const [products, departments, mapping, items, unavailable, boughtAt] = await Promise.all([
    getProducts(),
    getDepartments(store.id),
    getProductDepartments(store.id),
    getActiveItems(),
    getUnavailable(),
    getBoughtAt().catch(() => ({}) as Record<string, string[]>),
  ]);
  // Aantal per product op de lijst (nog niet afgevinkt); 0 = staat er niet op.
  const onList = new Map<string, number>();
  for (const i of items) if (!i.checked && i.product_id) onList.set(i.product_id, (onList.get(i.product_id) ?? 0) + i.quantity);
  // Niet te koop bij deze winkel (bijv. opschuimmelk bij de Aldi): onderaan in een eigen blok.
  // Met de hand aangegeven, of vanzelf: geen afdeling hier en volgens de bonnen alleen elders gekocht.
  const notHere = (p: { id: string; name: string }) =>
    unavailable.has(`${normalize(p.name)}|${store.id}`) ||
    (!mapping.get(p.id) && onlyBoughtElsewhere({ name: p.name, productId: p.id }, store.id, boughtAt));
  const view = (p: (typeof products)[number]) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    quantity: p.default_quantity,
    onList: onList.get(p.id) ?? 0,
    departmentId: notHere(p) ? NOT_HERE : (mapping.get(p.id) ?? ""),
  });
  const elsewhere = products.filter(notHere);
  const groups = [
    ...groupByRoute(products.filter((p) => !notHere(p)), departments, (p) => mapping.get(p.id)).map((g) => ({
      key: g.departmentId ?? "overig",
      name: g.name,
      products: g.items.map(view),
    })),
    ...(elsewhere.length ? [{ key: "elders", name: `Niet bij de ${store.name}`, products: elsewhere.map(view) }] : []),
  ];

  return (
    <FixedProducts
      groups={groups}
      storeName={store.name}
      storeId={store.id}
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
    />
  );
}
