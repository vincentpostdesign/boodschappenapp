import "server-only";
import { db, check } from "./db";
import { chosenStoreId } from "./session";
import { todayNL } from "./dates";
import type { Department, ListItem, PersonId, Product, Store } from "./types";
import type { KnownPrice } from "./prices/cheaper";

export async function getStores(): Promise<Store[]> {
  return check(await db().from("stores").select("*").order("sort_order"), "winkels ophalen") as Store[];
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
  return check(
    await db().from("departments").select("*").eq("store_id", storeId).order("sort_order"),
    "afdelingen ophalen",
  ) as Department[];
}

export async function getProducts(opts: { includeHidden?: boolean } = {}): Promise<Product[]> {
  let q = db().from("products").select("*").order("name").order("description", { nullsFirst: true });
  if (!opts.includeHidden) q = q.eq("hidden", false);
  return check(await q, "producten ophalen") as Product[];
}

/** product_id -> department_id voor één winkel. */
export async function getProductDepartments(storeId: string): Promise<Map<string, string>> {
  const rows = check(
    await db().from("product_store_department").select("product_id, department_id").eq("store_id", storeId),
    "afdelingskoppeling ophalen",
  ) as { product_id: string; department_id: string }[];
  return new Map(rows.map((r) => [r.product_id, r.department_id]));
}

export async function getActiveItems(): Promise<ListItem[]> {
  return check(
    await db().from("list_items").select("*").eq("archived", false).order("added_at"),
    "lijst ophalen",
  ) as ListItem[];
}

export async function getKnownPrices(): Promise<KnownPrice[]> {
  const rows = check(await db().from("product_prices").select("product_id, store_id, price"), "prijzen ophalen") as KnownPrice[];
  return rows.map((r) => ({ ...r, price: Number(r.price) }));
}

export async function getShopper(day = todayNL()): Promise<PersonId | null> {
  const row = check(
    await db().from("shopper_days").select("person_id").eq("day", day).maybeSingle(),
    "boodschapper ophalen",
  ) as { person_id: PersonId } | null;
  return row?.person_id ?? null;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = check(await db().from("settings").select("value").eq("key", key).maybeSingle(), "instelling ophalen") as {
    value: T;
  } | null;
  return row ? row.value : fallback;
}
