import Link from "next/link";
import { notFound } from "next/navigation";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { getDepartments, getStores } from "@/lib/data";
import { RouteEditor } from "@/components/beheer/RouteEditor";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Looproute · Boodschappen" };

export default async function RoutePage({ params }: { params: Promise<{ store: string }> }) {
  await requirePerson();
  const { store: storeId } = await params;
  const stores = await getStores();
  const store = stores.find((s) => s.id === storeId);
  if (!store) notFound();
  const [departments, links] = await Promise.all([
    getDepartments(store.id),
    db().from("product_store_department").select("department_id").eq("store_id", store.id),
  ]);
  const counts: Record<string, number> = {};
  for (const l of check(links, "koppelingen") as { department_id: string }[]) counts[l.department_id] = (counts[l.department_id] ?? 0) + 1;
  const defaultStore = stores.find((s) => s.is_default);

  return (
    <div className="space-y-4">
      <BackLink href="/beheer" label="Beheer" />
      <h1 className="text-2xl font-semibold tracking-tight">Looproute</h1>
      <nav aria-label="Winkel" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex gap-2">
          {stores.map((s) => (
            <Link
              key={s.id}
              href={`/beheer/route/${s.id}`}
              aria-current={s.id === store.id ? "page" : undefined}
              className={`flex h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${
                s.id === store.id ? "border-ink bg-ink text-bg" : "border-line bg-surface"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </nav>
      <p className="px-1 text-sm text-muted">
        Zet de afdelingen in de volgorde waarin je door de {store.name} loopt. De lijst volgt deze volgorde.
      </p>
      <RouteEditor
        key={store.id}
        storeId={store.id}
        storeName={store.name}
        departments={departments.map((d) => ({ id: d.id, name: d.name, products: counts[d.id] ?? 0 }))}
        copyFrom={defaultStore && defaultStore.id !== store.id ? { id: defaultStore.id, name: defaultStore.name } : null}
      />
    </div>
  );
}
