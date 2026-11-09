import Link from "next/link";
import { requirePerson, PEOPLE } from "@/lib/session";
import {
  getActiveItems,
  getActiveStore,
  getDepartments,
  getKnownPrices,
  getProductDepartments,
  getProducts,
  getShopper,
} from "@/lib/data";
import { groupByRoute } from "@/lib/route";
import { cheaperElsewhere } from "@/lib/prices/cheaper";
import { longDate, shortDate, todayNL } from "@/lib/dates";
import { StorePicker } from "@/components/StorePicker";
import { ListView, type ViewItem } from "@/components/ListView";

export const dynamic = "force-dynamic";

export default async function ListPage() {
  const me = await requirePerson();
  const { store, defaultStore, stores } = await getActiveStore();
  const [departments, mapping, items, prices, shopper, products] = await Promise.all([
    getDepartments(store.id),
    getProductDepartments(store.id),
    getActiveItems(),
    getKnownPrices(),
    getShopper(),
    getProducts(),
  ]);

  const storeNames = Object.fromEntries(stores.map((s) => [s.id, s.name]));
  const toView = (i: (typeof items)[number]): ViewItem => ({
    id: i.id,
    name: i.name,
    description: i.description,
    quantity: i.quantity,
    addedBy: i.added_by,
    addedOn: shortDate(i.added_at),
    checked: i.checked,
    cheaper: i.product_id ? cheaperElsewhere(i.product_id, defaultStore.id, prices, storeNames) : null,
  });

  const open = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked).sort((a, b) => (b.checked_at ?? "").localeCompare(a.checked_at ?? ""));
  const groups = groupByRoute(open, departments, (i) => (i.product_id ? mapping.get(i.product_id) : null)).map((g) => ({
    key: g.departmentId ?? "overig",
    name: g.name,
    items: g.items.map(toView),
  }));

  const today = todayNL();
  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <p className="text-sm font-medium text-muted first-letter:uppercase">{longDate(today)}</p>
        <ShopperBanner me={me} shopper={shopper} />
        <StorePicker stores={stores.map((s) => ({ id: s.id, name: s.name }))} activeId={store.id} />
      </header>

      <ListView
        groups={groups}
        done={done.map(toView)}
        suggestions={[...new Set(products.map((p) => p.name))]}
        storeName={store.name}
      />
    </div>
  );
}

function ShopperBanner({ me, shopper }: { me: string; shopper: string | null }) {
  if (!shopper) {
    return (
      <Link href="/beheer#wie" className="block rounded-2xl border border-dashed border-line px-4 py-3 text-muted">
        Nog niemand aangewezen voor vandaag. <span className="font-medium text-accent">Aanwijzen</span>
      </Link>
    );
  }
  const mine = shopper === me;
  const name = PEOPLE[shopper as keyof typeof PEOPLE]?.name ?? shopper;
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold ${
        mine ? "bg-accent text-accent-ink" : "bg-accent-soft text-ink"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${shopper === "vincent" ? "bg-vincent" : "bg-marleen"} ring-2 ring-white/70`} />
      {mine ? "Jij doet vandaag de boodschappen" : `${name} doet vandaag de boodschappen`}
    </div>
  );
}
