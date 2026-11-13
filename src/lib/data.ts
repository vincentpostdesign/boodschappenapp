import "server-only";
import { unstable_cache } from "next/cache";
import { db, check } from "./db";
import { chosenStoreId } from "./session";
import { addDays, todayNL } from "./dates";
import { parseSchedule, scheduleFromDays, shopperOn, type WeekSchedule } from "./schedule";
import type { Department, ListItem, PersonId, Product, Store } from "./types";
import type { KnownPrice } from "./prices/cheaper";

// Cache-labels. Gegevens die zelden veranderen worden bewaard en pas opnieuw opgehaald na een wijziging
// (revalidateTag in de acties) of uiterlijk na een uur.
export const TAG_CATALOGUS = "catalogus"; // winkels, afdelingen, vaste producten, afdelingskoppelingen
export const TAG_PRIJZEN = "prijzen"; // bonprijzen en gekoppelde acties

const cachedStores = unstable_cache(
  async () => check(await db().from("stores").select("*").order("sort_order"), "winkels ophalen") as Store[],
  ["stores-v1"],
  { tags: [TAG_CATALOGUS], revalidate: 3600 },
);
const cachedDepartments = unstable_cache(
  async () => check(await db().from("departments").select("*").order("sort_order"), "afdelingen ophalen") as Department[],
  ["departments-v1"],
  { tags: [TAG_CATALOGUS], revalidate: 3600 },
);
const cachedProducts = unstable_cache(
  async () =>
    check(
      await db().from("products").select("*").order("name").order("description", { nullsFirst: true }),
      "producten ophalen",
    ) as Product[],
  ["products-v1"],
  { tags: [TAG_CATALOGUS], revalidate: 3600 },
);
const cachedProductDepartments = unstable_cache(
  async () =>
    check(
      await db().from("product_store_department").select("product_id, store_id, department_id"),
      "afdelingskoppeling ophalen",
    ) as { product_id: string; store_id: string; department_id: string }[],
  ["psd-v1"],
  { tags: [TAG_CATALOGUS], revalidate: 3600 },
);

export async function getStores(): Promise<Store[]> {
  return cachedStores();
}

/** De gekozen winkel (cookie), anders de standaardwinkel. */
export async function getActiveStore(stores?: Store[]): Promise<{ store: Store; defaultStore: Store; stores: Store[] }> {
  const all = stores ?? (await getStores());
  const defaultStore = all.find((s) => s.is_default) ?? all[0];
  const chosen = await chosenStoreId();
  const store = all.find((s) => s.id === chosen) ?? defaultStore;
  return { store, defaultStore, stores: all };
}

export async function getDepartments(storeId: string): Promise<Department[]> {
  return (await cachedDepartments()).filter((d) => d.store_id === storeId);
}

export async function getProducts(opts: { includeHidden?: boolean } = {}): Promise<Product[]> {
  const all = await cachedProducts();
  return opts.includeHidden ? all : all.filter((p) => !p.hidden);
}

/** product_id -> department_id voor één winkel. */
export async function getProductDepartments(storeId: string): Promise<Map<string, string>> {
  const rows = (await cachedProductDepartments()).filter((r) => r.store_id === storeId);
  return new Map(rows.map((r) => [r.product_id, r.department_id]));
}

export async function getActiveItems(): Promise<ListItem[]> {
  return check(
    await db().from("list_items").select("*").eq("archived", false).order("added_at"),
    "lijst ophalen",
  ) as ListItem[];
}

/**
 * Bekende prijzen per product per winkel: referentieprijzen (bonnen) plus lopende acties die
 * aan een vast product gekoppeld zijn. Per product/winkel telt de laagste.
 */
export async function getKnownPrices(): Promise<KnownPrice[]> {
  return cachedKnownPrices(todayNL());
}

const cachedKnownPrices = unstable_cache(
  async (today: string) => loadKnownPrices(today),
  ["known-prices-v1"],
  { tags: [TAG_PRIJZEN], revalidate: 3600 },
);

async function loadKnownPrices(today: string): Promise<KnownPrice[]> {
  const [ref, offers] = await Promise.all([
    db().from("product_prices").select("product_id, store_id, price"),
    db()
      .from("offers_cache")
      .select("product_id, store_id, price")
      .not("product_id", "is", null)
      .not("price", "is", null)
      .eq("status", "active")
      .lte("valid_from", today)
      .gte("valid_until", today),
  ]);
  const best = new Map<string, KnownPrice>();
  for (const r of [...(check(ref, "prijzen") as KnownPrice[]), ...(check(offers, "acties") as KnownPrice[])]) {
    const key = `${r.product_id}:${r.store_id}`;
    const price = Number(r.price);
    const cur = best.get(key);
    if (!cur || price < cur.price) best.set(key, { product_id: r.product_id, store_id: r.store_id, price });
  }
  return [...best.values()];
}

/**
 * Het vaste weekrooster (settings 'weekrooster'). Bestaat het nog niet, dan wordt het afgeleid
 * uit de datums die eerder per dag waren ingevuld, zodat niets verloren gaat.
 */
export async function getWeekSchedule(): Promise<WeekSchedule> {
  const row = check(await db().from("settings").select("value").eq("key", "weekrooster").maybeSingle(), "weekrooster") as {
    value: unknown;
  } | null;
  if (row) return parseSchedule(row.value);
  const today = todayNL();
  const days = check(
    await db().from("shopper_days").select("day, person_id").gte("day", today).lte("day", addDays(today, 13)),
    "planning",
  ) as { day: string; person_id: string }[];
  return scheduleFromDays(days);
}

export async function getShopper(day = todayNL()): Promise<PersonId | null> {
  return shopperOn(await getWeekSchedule(), day);
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = check(await db().from("settings").select("value").eq("key", key).maybeSingle(), "instelling ophalen") as {
    value: T;
  } | null;
  return row ? row.value : fallback;
}

/**
 * Productnamen van jullie eigen bonnen (wat jullie echt kopen), vaakst gekocht eerst.
 * Voor de voorstellen bij het intypen: "kaas" → "Jonge kaas 48+ plakken".
 */
export const getReceiptNames = unstable_cache(
  async (): Promise<string[]> => {
    const rows = check(
      await db().from("receipt_lines").select("raw_name, price").gt("price", 0).limit(3000),
      "bonnamen",
    ) as { raw_name: string; price: number }[];
    const count = new Map<string, { name: string; n: number }>();
    for (const r of rows) {
      const name = r.raw_name.trim();
      if (name.length < 2 || /statiegeld|korting|emballage|tasje|tas\b/i.test(name)) continue;
      const k = name.toLowerCase();
      const cur = count.get(k);
      count.set(k, { name: cur?.name ?? name, n: (cur?.n ?? 0) + 1 });
    }
    return [...count.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "nl")).map((x) => x.name);
  },
  ["receipt-names-v1"],
  { tags: [TAG_PRIJZEN], revalidate: 600 },
);
