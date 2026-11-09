import "server-only";
import type { Offer, PriceSource } from "./types";

// Documentatie: https://github.com/PrijsProfeet/supermarkt-api
// Zonder sleutel: 30/min op bulk-endpoints, 120/min op zoeken. Alleen acties, geen schapprijzen.
const BASE = "https://www.prijsprofeet.nl/api/v1";
const UA = "Boodschappen-app/0.1 (prive gebruik)";

const RETAILER: Record<string, string> = {
  aldi: "aldi",
  jumbo: "jumbo",
  plus: "plus",
  ah: "albert_heijn",
  lidl: "lidl",
};
const STORE_BY_RETAILER = Object.fromEntries(Object.entries(RETAILER).map(([k, v]) => [v, k]));

type Row = {
  product_id: string;
  name: string;
  brand: string | null;
  unified_category?: string | null;
  quantity?: string | null;
  price: number | null;
  original_price: number | null;
  discount_percentage?: number | null;
  savings_percentage?: number | null;
  promotion_type?: string | null;
  promotion_status?: string | null;
  promotional_keywords?: string[];
  multi_buy_quantity?: number | null;
  multi_buy_price?: number | null;
  valid_from: string | null;
  valid_until: string | null;
  product_url?: string | null;
  image_url?: string | null;
  retailer?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, cache: "no-store" });
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after") ?? 10);
      await sleep(Math.min(60, wait) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`PrijsProfeet ${path}: HTTP ${res.status}`);
    return (await res.json()) as T;
  }
  throw new Error(`PrijsProfeet ${path}: te veel verzoeken`);
}

const euro = (n: number) => `€${n.toFixed(2).replace(".", ",")}`;

export function promoLabel(r: Row): string | null {
  const pct = r.savings_percentage ?? r.discount_percentage;
  if (r.promotion_type === "one_plus_one") return "1+1 gratis";
  if (r.multi_buy_quantity && r.multi_buy_price) return `${r.multi_buy_quantity} voor ${euro(r.multi_buy_price)}`;
  if (pct) return `${Math.round(pct)}% korting`;
  if (r.promotional_keywords?.length) return r.promotional_keywords.join(", ");
  return null;
}

export function toOffer(r: Row, storeId: string): Offer {
  const pct = r.savings_percentage ?? r.discount_percentage ?? null;
  return {
    source: "prijsprofeet",
    // product_id bevat de datum; base_product_id is stabiel, maar per actieperiode willen we een nieuwe regel.
    externalId: r.product_id,
    storeId,
    name: r.name,
    brand: r.brand ?? null,
    category: r.unified_category ?? null,
    quantity: r.quantity?.replace(/\.$/, "") ?? null,
    price: r.price ?? null,
    originalPrice: r.original_price && r.original_price !== r.price ? r.original_price : null,
    discountPct: pct ? Math.round(pct) : r.promotion_type === "one_plus_one" ? 50 : null,
    promoLabel: promoLabel(r),
    validFrom: r.valid_from,
    validUntil: r.valid_until,
    status: r.promotion_status === "upcoming" ? "upcoming" : "active",
    url: r.product_url ?? null,
    imageUrl: r.image_url ?? null,
  };
}

export const prijsProfeet: PriceSource = {
  id: "prijsprofeet",

  async promotions(storeId) {
    const retailer = RETAILER[storeId];
    if (!retailer) return [];
    const out: Offer[] = [];
    for (let page = 1; page <= 40; page++) {
      const data = await get<{ total: number; products: Row[] }>("/products/promotional/all", { retailer, page, page_size: 100 });
      for (const r of data.products ?? []) out.push(toOffer(r, storeId));
      if (!data.products?.length || page * 100 >= data.total) break;
      await sleep(2100); // bulk-limiet 30/min
    }
    return out;
  },

  async search(query, limit = 30) {
    const data = await get<{ results: Row[] }>("/search", { q: query, page_size: Math.min(100, limit * 3) });
    return (data.results ?? [])
      .filter((r) => r.retailer && STORE_BY_RETAILER[r.retailer])
      .slice(0, limit)
      .map((r) => toOffer(r, STORE_BY_RETAILER[r.retailer!]));
  },
};
