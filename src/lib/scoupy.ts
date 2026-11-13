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
      const starts = toIso(c.coupon_startdate);
      const ends = toIso(c.coupon_enddate);
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
          short: (c.subtitle_short ?? "").trim(),
          starts,
          ends,
          stores,
          image: c.image && /^[\w.,-]+\.(jpe?g|png|webp)$/i.test(c.image) ? `https://assets.scoupy.nl/464/${c.image}` : null,
        });
      }
      return;
    }
    for (const k in o as Record<string, unknown>) walk((o as Record<string, unknown>)[k]);
  };
  walk(data);
  return [...found.values()];
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
