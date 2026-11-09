import { requirePerson } from "@/lib/session";
import { getProducts, getStores } from "@/lib/data";
import { ProductAdmin } from "@/components/beheer/ProductAdmin";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vaste producten beheren · Boodschappen" };

export default async function ProductenBeheerPage() {
  await requirePerson();
  const [products, stores] = await Promise.all([getProducts({ includeHidden: true }), getStores()]);
  const storeNames = Object.fromEntries(stores.map((s) => [s.id, s.name]));
  return (
    <div className="space-y-4">
      <BackLink href="/beheer" label="Beheer" />
      <ProductAdmin
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          hidden: p.hidden,
          store: p.default_store_id ? storeNames[p.default_store_id] : null,
          quantity: p.default_quantity,
        }))}
      />
    </div>
  );
}
