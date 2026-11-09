import "server-only";
import { db, check } from "../db";
import { todayNL } from "../dates";
import { sendToPerson } from "../push";
import { prijsProfeet } from "./prijsprofeet";
import { categoriesForDepartments, isGoodDeal, offerMatchesProduct, offerMatchesWatch } from "./match";
import type { Offer, PriceSource } from "./types";
import type { PersonId } from "../types";

type WatchRow = { id: string; name: string; brand: string | null; max_price: number | null; min_discount_pct: number | null; added_by: PersonId | null };

export type RefreshResult = { perStore: Record<string, number>; linkedToProducts: number; newHits: number; errors: string[] };

/** Haalt alle acties op, koppelt ze aan vaste producten en maakt watchlist-treffers aan. */
export async function refreshOffers(source: PriceSource = prijsProfeet): Promise<RefreshResult> {
  const stores = check(await db().from("stores").select("id").order("sort_order"), "winkels") as { id: string }[];
  const products = check(await db().from("products").select("id, name, description"), "producten") as {
    id: string;
    name: string;
    description: string | null;
  }[];
  const depLinks = check(
    await db().from("product_store_department").select("product_id, department:departments(name)"),
    "afdelingen",
  ) as unknown as { product_id: string; department: { name: string } | null }[];
  const allowed = new Map<string, Set<string>>();
  for (const p of products) {
    allowed.set(p.id, categoriesForDepartments(depLinks.filter((l) => l.product_id === p.id).map((l) => l.department?.name ?? "")));
  }
  const watch = check(
    await db().from("watchlist_items").select("id, name, brand, max_price, min_discount_pct, added_by"),
    "watchlist",
  ) as WatchRow[];

  const result: RefreshResult = { perStore: {}, linkedToProducts: 0, newHits: 0, errors: [] };
  const all: Offer[] = [];
  for (const s of stores) {
    try {
      const offers = await source.promotions(s.id);
      result.perStore[s.id] = offers.length;
      all.push(...offers);
    } catch (e) {
      result.errors.push(`${s.id}: ${(e as Error).message}`);
    }
  }

  // Opslaan in batches, met koppeling aan een vast product (alleen bij precies één passend product).
  const rows = all.map((o) => {
    const matches = products.filter((p) => offerMatchesProduct(o, p, allowed.get(p.id)));
    const product_id = matches.length === 1 ? matches[0].id : null;
    if (product_id) result.linkedToProducts++;
    return {
      source: o.source,
      store_id: o.storeId,
      external_id: o.externalId,
      name: o.name,
      brand: o.brand,
      category: o.category,
      quantity: o.quantity,
      price: o.price,
      original_price: o.originalPrice,
      discount_pct: o.discountPct,
      promo_label: o.promoLabel,
      valid_from: o.validFrom,
      valid_until: o.validUntil,
      status: o.status,
      url: o.url,
      image_url: o.imageUrl,
      product_id,
      fetched_at: new Date().toISOString(),
    };
  });
  const saved: { id: string; external_id: string; store_id: string }[] = [];
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = check(
      await db().from("offers_cache").upsert(chunk, { onConflict: "source,store_id,external_id" }).select("id, external_id, store_id"),
      "aanbiedingen opslaan",
    ) as { id: string; external_id: string; store_id: string }[];
    saved.push(...res);
  }

  // Verlopen acties opruimen (treffers verdwijnen mee via cascade).
  check(await db().from("offers_cache").delete().lt("valid_until", todayNL()), "verlopen acties");

  // Watchlist-treffers
  const idOf = new Map(saved.map((r) => [`${r.store_id}:${r.external_id}`, r.id]));
  const hits: { watchlist_item_id: string; offer_id: string }[] = [];
  for (const o of all) {
    const offerId = idOf.get(`${o.storeId}:${o.externalId}`);
    if (!offerId) continue;
    for (const w of watch) {
      if (offerMatchesWatch(o, w) && isGoodDeal(o, { max_price: w.max_price, min_discount_pct: w.min_discount_pct })) {
        hits.push({ watchlist_item_id: w.id, offer_id: offerId });
      }
    }
  }
  if (hits.length) {
    const inserted = check(
      await db().from("watchlist_hits").upsert(hits, { onConflict: "watchlist_item_id,offer_id", ignoreDuplicates: true }).select("id"),
      "treffers opslaan",
    ) as { id: string }[];
    result.newHits = inserted.length;
  }

  if (Object.keys(result.perStore).length) {
    check(
      await db().from("settings").upsert({ key: "offers_refreshed_at", value: new Date().toISOString() }),
      "verversdatum",
    );
  }
  return result;
}

/** Koppelt opgeslagen acties opnieuw aan vaste producten (na nieuwe/gewijzigde producten), zonder ophalen. */
export async function relinkOffers(): Promise<{ checked: number; linked: number }> {
  const products = check(await db().from("products").select("id, name, description"), "producten") as {
    id: string;
    name: string;
    description: string | null;
  }[];
  const depLinks = check(
    await db().from("product_store_department").select("product_id, department:departments(name)"),
    "afdelingen",
  ) as unknown as { product_id: string; department: { name: string } | null }[];
  const allowed = new Map(
    products.map((p) => [p.id, categoriesForDepartments(depLinks.filter((l) => l.product_id === p.id).map((l) => l.department?.name ?? ""))]),
  );
  const offers: { id: string; name: string; brand: string | null; category: string | null; product_id: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const page = check(
      await db().from("offers_cache").select("id, name, brand, category, product_id").order("id").range(from, from + 999),
      "acties",
    ) as typeof offers;
    offers.push(...page);
    if (page.length < 1000) break;
  }
  const changes = new Map<string | null, string[]>();
  let linked = 0;
  for (const o of offers) {
    const m = products.filter((p) => offerMatchesProduct(o, p, allowed.get(p.id)));
    const pid = m.length === 1 ? m[0].id : null;
    if (pid) linked++;
    if (pid !== o.product_id) changes.set(pid, [...(changes.get(pid) ?? []), o.id]);
  }
  for (const [pid, ids] of changes) {
    for (let i = 0; i < ids.length; i += 300) {
      check(await db().from("offers_cache").update({ product_id: pid }).in("id", ids.slice(i, i + 300)), "koppelen");
    }
  }
  return { checked: offers.length, linked };
}

type HitRow = {
  id: string;
  offer: { name: string; store_id: string; price: number | null; promo_label: string | null; valid_until: string | null; status: string };
  item: { name: string; brand: string | null; added_by: PersonId | null };
};

const shortDay = (d: string | null) =>
  d ? new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)).replace(/\./g, "") : "";

/**
 * Verstuurt meldingen voor nieuwe treffers.
 * - 'direct': elke nieuwe treffer meteen.
 * - 'wekelijks': alleen op maandag, gebundeld per persoon.
 */
export async function notifyWatchHits(now = new Date()): Promise<{ mode: string; sent: number; pending: number }> {
  const modeRow = check(await db().from("settings").select("value").eq("key", "watchlist_notify").maybeSingle(), "instelling") as {
    value: string;
  } | null;
  const mode = modeRow?.value === "wekelijks" ? "wekelijks" : "direct";
  const stores = Object.fromEntries(
    (check(await db().from("stores").select("id, name"), "winkels") as { id: string; name: string }[]).map((s) => [s.id, s.name]),
  );
  const hits = check(
    await db()
      .from("watchlist_hits")
      .select("id, offer:offers_cache(name, store_id, price, promo_label, valid_until, status), item:watchlist_items(name, brand, added_by)")
      .is("notified_at", null),
    "treffers",
  ) as unknown as HitRow[];
  if (!hits.length) return { mode, sent: 0, pending: 0 };

  const isMonday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/Amsterdam" }).format(now) === "Mon";
  if (mode === "wekelijks" && !isMonday) return { mode, sent: 0, pending: hits.length };

  const everyone: PersonId[] = ["vincent", "marleen"];
  const recipients = (h: HitRow) => (h.item.added_by ? [h.item.added_by] : everyone);
  const describe = (h: HitRow) => {
    const price = h.offer.price != null ? ` €${Number(h.offer.price).toFixed(2).replace(".", ",")}` : "";
    const label = h.offer.promo_label ? ` (${h.offer.promo_label})` : "";
    const until = h.offer.valid_until ? `, t/m ${shortDay(h.offer.valid_until)}` : "";
    return `${stores[h.offer.store_id] ?? h.offer.store_id}:${price}${label}${until}`;
  };

  let sent = 0;
  if (mode === "direct") {
    // Eén melding per watchlist-product: de goedkoopste nieuwe aanbieding, plus het aantal andere.
    const perItem = new Map<string, HitRow[]>();
    for (const h of hits) {
      const key = `${h.item.brand ?? ""}|${h.item.name}`;
      perItem.set(key, [...(perItem.get(key) ?? []), h]);
    }
    for (const list of perItem.values()) {
      list.sort((a, b) => (a.offer.price ?? 1e9) - (b.offer.price ?? 1e9));
      const best = list[0];
      const more = list.length > 1 ? ` (+${list.length - 1} andere aanbieding${list.length > 2 ? "en" : ""})` : "";
      for (const p of recipients(best)) {
        sent += await sendToPerson(p, {
          title: `Aanbieding: ${[best.item.brand, best.item.name].filter(Boolean).join(" ")}`,
          body: `${best.offer.name} bij ${describe(best)}${more}`,
          url: `/watchlist?hit=${best.id}`,
          tag: `hit-${best.id}`,
          actions: [{ action: "op-de-lijst", title: "Op de lijst" }],
        });
      }
    }
  } else {
    const perPerson = new Map<PersonId, HitRow[]>();
    for (const h of hits) for (const p of recipients(h)) perPerson.set(p, [...(perPerson.get(p) ?? []), h]);
    for (const [p, list] of perPerson) {
      sent += await sendToPerson(p, {
        title: `${list.length} goede aanbieding${list.length === 1 ? "" : "en"} deze week`,
        body: list.slice(0, 4).map((h) => `${h.item.name} – ${describe(h)}`).join("\n"),
        url: "/watchlist",
        tag: "watchlist-week",
      });
    }
  }
  check(
    await db().from("watchlist_hits").update({ notified_at: new Date().toISOString(), bundled: mode === "wekelijks" }).in("id", hits.map((h) => h.id)),
    "treffers gemeld",
  );
  return { mode, sent, pending: 0 };
}
