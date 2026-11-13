// Scoupy (cashback-app): de boodschappenacties staan openbaar op scoupy.com/nl-NL/groceries.
// We lezen die pagina (Next.js-gegevens in de HTML) en houden alleen de lopende cashback-acties over.
import { normalize } from "./route";

export type ScoupyDeal = {
  id: number;
  title: string; // "Optimel Proteïne Extra Drinkyoghurt: van €1,79 voor €0,01"
  product: string; // "Optimel Proteïne Extra Drinkyoghurt 330ml"
  brand: string; // "Optimel"
  short: string; // "€0,01" of "50%"
  starts: string; // ISO
  ends: string; // ISO
  stores: string[]; // ["Albert Heijn"], leeg = overal
  image: string | null;
};

const URL_GROCERIES = "https://scoupy.com/nl-NL/groceries";

type RawCoupon = {
  id_coupon?: number;
  coupon_type?: string;
  coupon_title?: string;
  title?: string;
  product_title?: string;
  client_title?: string;
  subtitle_short?: string;
  coupon_startdate?: string;
  coupon_enddate?: string;
  coupon_available?: string;
  retailer_availability?: string;
  available_clients?: { client_title?: string; client_type?: string }[];
  image?: string;
  // Velden op de detailpagina van één actie
  coupon_subtitle_short?: string;
  coupon_image?: string;
};

// Scoupy geeft Nederlandse tijd zonder tijdzone ("2026-11-12 23:59:59").
const toIso = (s: string | undefined) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const local = s.replace(" ", "T");
  const month = Number(s.slice(5, 7));
  const offset = month >= 4 && month <= 10 ? "+02:00" : "+01:00"; // ruwe zomer-/wintertijd volstaat hier
  return new Date(local + offset).toISOString();
};

/** Haalt de cashback-acties uit de HTML van de Scoupy-boodschappenpagina. */
export function parseScoupyHtml(html: string): ScoupyDeal[] {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  let data: unknown;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return [];
  }
  const found = new Map<number, ScoupyDeal>();
  const walk = (o: unknown) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    const c = o as RawCoupon;
    if (typeof c.id_coupon === "number" && c.coupon_title) {
      // De detailpagina van een actie noemt geen begindatum: dan geldt hij vanaf nu.
      const starts = toIso(c.coupon_startdate) ?? (c.coupon_startdate ? null : new Date().toISOString());
      const ends = toIso(c.coupon_enddate);
      const img = [c.image, c.coupon_image].find((x) => x && /^[\w.,-]+\.(jpe?g|png|webp)$/i.test(x));
      if (c.coupon_type === "cashback" && c.coupon_available !== "no" && starts && ends) {
        const stores =
          c.retailer_availability === "all"
            ? []
            : [...new Set((c.available_clients ?? []).filter((x) => x.client_type === "retail" && x.client_title).map((x) => x.client_title!))];
        found.set(c.id_coupon, {
          id: c.id_coupon,
          title: (c.title || c.coupon_title).trim(),
          product: (c.product_title || c.coupon_title.split(":")[0]).trim(),
          brand: (c.client_title ?? "").trim(),
          short: (c.subtitle_short ?? c.coupon_subtitle_short ?? "").trim(),
          starts,
          ends,
          stores,
          image: img ? `https://assets.scoupy.nl/464/${img}` : null,
        });
      }
      return;
    }
    for (const k in o as Record<string, unknown>) walk((o as Record<string, unknown>)[k]);
  };
  walk(data);
  return [...found.values()];
}

/**
 * Actienummer uit een gedeelde Scoupy-link, bijv.
 * https://scoupy.com/nl/geld-terug/optimel/optimel-drink-…/56012/co of https://scoupy.com/nl-NL/groceries/56012.
 */
export function dealIdFromLink(text: string): number | null {
  const url = text.match(/https?:\/\/[^\s]+/)?.[0];
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!/(^|\.)scoupy\.(com|nl)$/.test(u.hostname)) return null;
  const m = u.pathname.match(/\/(\d{4,8})(?:\/[a-z]{1,4})?\/?$/);
  return m ? Number(m[1]) : null;
}

/** Eén actie ophalen via zijn openbare detailpagina (ook acties die niet in de algemene lijst staan). */
export async function fetchScoupyDeal(id: number): Promise<ScoupyDeal | null> {
  const res = await fetch(`https://scoupy.com/nl-NL/groceries/${id}`, {
    headers: { "User-Agent": "Mozilla/5.0 (Boodschappenapp; persoonlijk gebruik)", "Accept-Language": "nl-NL" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const html = await res.text();
  const deal = parseScoupyHtml(html).find((d) => d.id === id) ?? null;
  if (deal && !deal.image) {
    const og = html.match(/<meta[^>]+property="og:image"[^>]+content="(https:\/\/assets\.scoupy\.nl\/[^"]+)"/)?.[1];
    if (og) deal.image = og;
  }
  return deal;
}

export async function fetchScoupyDeals(): Promise<ScoupyDeal[]> {
  const res = await fetch(URL_GROCERIES, {
    headers: { "User-Agent": "Mozilla/5.0 (Boodschappenapp; persoonlijk gebruik)", "Accept-Language": "nl-NL" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Scoupy gaf ${res.status}`);
  return parseScoupyHtml(await res.text());
}

/** Loopt de actie nu (of begint hij vandaag nog)? */
export function isCurrent(d: ScoupyDeal, now = new Date()): boolean {
  return new Date(d.ends) >= now && new Date(d.starts).getTime() - now.getTime() < 24 * 3600_000;
}

/** Korte winkelnaam zoals in de app ("Albert Heijn" → "AH", "ALDI" → "Aldi"). */
export function shortStore(name: string): string {
  const n = normalize(name);
  if (n === "albert heijn" || n === "ah") return "AH";
  return n.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Geldt de actie bij deze winkel? Geen winkels genoemd = overal. */
export function validAt(d: ScoupyDeal, storeName: string): boolean {
  if (!d.stores.length) return true;
  const want = shortStore(storeName);
  return d.stores.some((s) => shortStore(s) === want);
}

/** "AH, Jumbo, Aldi, Lidl, Plus" of "alle winkels". */
export function storeList(d: ScoupyDeal): string {
  return d.stores.length ? d.stores.map(shortStore).join(", ") : "alle winkels";
}

const STOP = new Set(["de", "het", "een", "van", "voor", "met", "en", "of", "ml", "l", "g", "kg", "cl", "st", "stuks", "pak", "fles", "extra", "original", "classic"]);
const words = (s: string) => normalize(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w) && !/^\d/.test(w));

/**
 * Hoort een Scoupy-actie bij deze regel van de lijst/watchlist?
 * - Het merk komt als heel woord in de naam voor ("Optimel" ↔ "Optimel drinkyoghurt"), of
 * - alle betekenisvolle woorden van de naam komen voor in het actieproduct ("drinkyoghurt" ↔ "Optimel Proteïne Extra Drinkyoghurt").
 */
export function dealMatches(itemName: string, d: ScoupyDeal): boolean {
  const name = ` ${normalize(itemName)} `;
  const brand = normalize(d.brand);
  if (brand.length > 2 && name.includes(` ${brand} `)) return true;
  const w = words(itemName);
  if (!w.length) return false;
  const product = ` ${normalize(`${d.brand} ${d.product}`)} `;
  return w.every((x) => product.includes(` ${x} `));
}
