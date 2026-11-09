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
  const onList = new Set(items.filter((i) => !i.checked && i.product_id).map((i) => i.product_id!));
  const groups = groupByRoute(products, departments, (p) => mapping.get(p.id)).map((g) => ({
    key: g.departmentId ?? "overig",
    name: g.name,
    products: g.items.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      quantity: p.default_quantity,
      onList: onList.has(p.id),
    })),
  }));

  return <FixedProducts groups={groups} storeName={store.name} />;
}
