import { notFound } from "next/navigation";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { getStores } from "@/lib/data";
import type { Department, Product } from "@/lib/types";
import { ProductForm } from "@/components/beheer/ProductForm";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Product bewerken · Boodschappen" };

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerson();
  const { id } = await params;
  const isNew = id === "nieuw";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [stores, departments, product, mapping] = await Promise.all([
    getStores(),
    db().from("departments").select("*").order("sort_order"),
    isNew ? Promise.resolve({ data: null, error: null }) : db().from("products").select("*").eq("id", id).maybeSingle(),
    isNew
      ? Promise.resolve({ data: [], error: null })
      : db().from("product_store_department").select("store_id, department_id").eq("product_id", id),
  ]);
  const p = check(product, "product") as Product | null;
  if (!isNew && !p) notFound();
  const deps = check(departments, "afdelingen") as Department[];
  const current = Object.fromEntries(
    (check(mapping, "koppeling") as { store_id: string; department_id: string }[]).map((m) => [m.store_id, m.department_id]),
  );

  return (
    <div className="space-y-4">
      <BackLink href="/beheer/producten" label="Vaste producten" />
      <h1 className="text-2xl font-semibold tracking-tight">{isNew ? "Nieuw vast product" : p!.name}</h1>
      <ProductForm
        product={p}
        stores={stores.map((s) => ({
          id: s.id,
          name: s.name,
          isDefault: s.is_default,
          departments: deps.filter((d) => d.store_id === s.id).map((d) => ({ id: d.id, name: d.name })),
        }))}
        current={current}
      />
    </div>
  );
}
