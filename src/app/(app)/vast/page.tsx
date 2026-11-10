import { requirePerson } from "@/lib/session";
import { getActiveItems, getActiveStore, getDepartments, getProductDepartments, getProducts } from "@/lib/data";
import { groupByRoute } from "@/lib/route";
import { FixedProducts } from "@/components/FixedProducts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vaste producten · Boodschappen" };

export default async function VastPage() {
  await requirePerson();
  const { store } = await getActiveStore();
  const [products, departments, mapping, items] = await Promise.all([
    getProducts(),
    getDepartments(store.id),
    getProductDepartments(store.id),
    getActiveItems(),
  ]);
  // Aantal per product op de lijst (nog niet afgevinkt); 0 = staat er niet op.
  const onList = new Map<string, number>();
  for (const i of items) if (!i.checked && i.product_id) onList.set(i.product_id, (onList.get(i.product_id) ?? 0) + i.quantity);
  const groups = groupByRoute(products, departments, (p) => mapping.get(p.id)).map((g) => ({
    key: g.departmentId ?? "overig",
    name: g.name,
    products: g.items.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      quantity: p.default_quantity,
      onList: onList.get(p.id) ?? 0,
    })),
  }));

  return <FixedProducts groups={groups} storeName={store.name} />;
}
