import Link from "next/link";
import { requirePerson, PEOPLE } from "@/lib/session";
import {
  getActiveItems,
  getActiveStore,
  getDepartments,
  getKnownPrices,
  getProductDepartments,
  getProducts,
  getReceiptNames,
  getUnavailable,
  getShopper,
} from "@/lib/data";
import { groupByRoute, normalize } from "@/lib/route";
import { after } from "next/server";
import { getScoupyDeals } from "@/lib/scoupy-store";
import { dealMatches, storeList, validAt, type ScoupyDeal } from "@/lib/scoupy";
import { departmentForCategory } from "@/lib/categories";
import { categorizeUnknown, categoryOf, getCategoryMemory, memoryReady } from "@/lib/categorize";
import { cheaperElsewhere } from "@/lib/prices/cheaper";
import { longDate, shortDate, todayNL } from "@/lib/dates";
import { StorePicker } from "@/components/StorePicker";
import { ListView, type ViewItem } from "@/components/ListView";

export const dynamic = "force-dynamic";

export default async function ListPage() {
  const me = await requirePerson();
  const { store, defaultStore, stores } = await getActiveStore();
  const [departments, mapping, items, prices, shopper, products, memory, scoupy, receiptNames, unavailable] = await Promise.all([
    getDepartments(store.id),
    getProductDepartments(store.id),
    getActiveItems(),
    getKnownPrices(),
    getShopper(),
    getProducts(),
    getCategoryMemory(),
    getScoupyDeals().catch(() => [] as ScoupyDeal[]),
    getReceiptNames().catch(() => [] as string[]),
    getUnavailable(),
  ]);
  // Niet te koop bij de gekozen winkel (bijv. opschuimmelk bij de Aldi): onderaan in een eigen blok.
  const notHere = (i: { name: string }) => unavailable.has(`${normalize(i.name)}|${store.id}`);
  // Scoupy-actie bij deze regel (bijv. "Optimel" → Optimel drinkyoghurt voor €0,01 bij de Albert Heijn).
  // Een actie die bij de gekozen winkel geldt gaat voor; anders tonen we bij welke winkels hij wél geldt.
  const scoupyFor = (name: string) => {
    const hits = scoupy.filter((x) => dealMatches(name, x));
    const d = hits.find((x) => validAt(x, store.name)) ?? hits[0];
    if (!d) return null;
    return { label: d.short || "cashback", product: d.product, stores: storeList(d), here: validAt(d, store.name), storeName: store.name, until: shortDate(d.ends) };
  };
  // Losse regels die nog niet ingedeeld kunnen worden: Claude doet dat op de achtergrond.
  if (memoryReady(memory) && items.some((i) => !i.product_id && !categoryOf(i, memory))) after(() => categorizeUnknown().catch(() => 0));
  // Afdeling: vast product met een gekoppelde afdeling, anders op soort product (los ingetypt of nog niet gekoppeld).
  const departmentOf = (i: (typeof items)[number]) =>
    (i.product_id ? mapping.get(i.product_id) : null) ?? departmentForCategory(categoryOf(i, memory), departments);

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
    category: categoryOf(i, memory),
    movable: memoryReady(memory) && !(i.product_id && mapping.get(i.product_id)),
    fixed: !!i.product_id,
    scoupy: i.checked ? null : scoupyFor(i.name),
    notHere: notHere(i),
  });

  const open = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked).sort((a, b) => (b.checked_at ?? "").localeCompare(a.checked_at ?? ""));
  const elsewhere = open.filter(notHere);
  const groups = [
    ...groupByRoute(
      open.filter((i) => !notHere(i)),
      departments,
      departmentOf,
    ).map((g) => ({
      key: g.departmentId ?? "overig",
      name: g.name,
      items: g.items.map(toView),
    })),
    ...(elsewhere.length ? [{ key: "elders", name: `Niet bij de ${store.name}`, items: elsewhere.map(toView) }] : []),
  ];

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
        suggestions={[
          ...[...new Set(products.map((p) => p.name))].map((name) => ({ name, from: "vast" as const })),
          ...receiptNames
            .filter((n) => !products.some((p) => p.name.toLowerCase() === n.toLowerCase()))
            .slice(0, 400)
            .map((name) => ({ name, from: "bon" as const })),
          ...scoupy.map((d) => ({ name: d.product, from: "scoupy" as const, note: d.short || "cashback" })),
        ]}
        storeName={store.name}
        storeId={store.id}
        me={me}
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
