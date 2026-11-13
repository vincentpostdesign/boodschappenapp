// Rekenwerk voor het dashboard (puur, getest).
import { normalize } from "./route";

export type Period = "4w" | "3m" | "jaar";
export const PERIOD_DAYS: Record<Period, number> = { "4w": 28, "3m": 91, jaar: 365 };

/** Emmers voor de kolommen: weken bij 4 weken, anders maanden. Sleutel = eerste dag van de emmer. */
export function buckets(period: Period, today: string): { key: string; label: string }[] {
  const d = new Date(`${today}T12:00:00Z`);
  if (period === "4w") {
    // Maandag van deze week, 4 weken terug
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return Array.from({ length: 4 }, (_, i) => {
      const m = new Date(monday);
      m.setUTCDate(monday.getUTCDate() - 7 * (3 - i));
      const key = m.toISOString().slice(0, 10);
      return { key, label: `wk ${isoWeek(m)}` };
    });
  }
  const n = period === "3m" ? 3 : 12;
  return Array.from({ length: n }, (_, i) => {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (n - 1 - i), 1, 12));
    return {
      key: m.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "UTC" }).format(m).replace(".", ""),
    };
  });
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Zet een datum in de juiste emmer (de laatste emmer waarvan de sleutel <= datum). */
export function bucketOf(day: string, keys: string[]): string | null {
  let found: string | null = null;
  for (const k of keys) if (k <= day) found = k;
  return found;
}

export type Purchase = { day: string; productId: string | null; name: string };
export type Frequency = { key: string; name: string; productId: string | null; times: number; lastDay: string; kind: "vaak" | "soms" | "eenmalig" };

/**
 * Hoe vaak is iets gekocht (aantal verschillende dagen)?
 * vaak  = gemiddeld minstens eens per twee weken in de periode (en minstens 3 keer)
 * soms  = 2 keer of meer, maar minder dan dat
 */
export function frequencies(purchases: Purchase[], periodDays: number): Frequency[] {
  const groups = new Map<string, { name: string; productId: string | null; days: Set<string> }>();
  for (const p of purchases) {
    const key = p.productId ?? `naam:${normalize(p.name)}`;
    const g = groups.get(key) ?? { name: p.name, productId: p.productId, days: new Set<string>() };
    g.days.add(p.day);
    groups.set(key, g);
  }
  const vaakDrempel = Math.max(3, Math.floor(periodDays / 14));
  return [...groups]
    .map(([key, g]) => {
      const times = g.days.size;
      const kind: Frequency["kind"] = times >= vaakDrempel ? "vaak" : times >= 2 ? "soms" : "eenmalig";
      return { key, name: g.name, productId: g.productId, times, lastDay: [...g.days].sort().at(-1)!, kind };
    })
    .sort((a, b) => b.times - a.times || a.name.localeCompare(b.name, "nl"));
}

// ---------- prijsverloop vaste producten ----------

export type PricePoint = { productId: string; day: string; store: string; unit: number };
export type PriceTrend = {
  productId: string;
  first: PricePoint;
  last: PricePoint;
  change: number; // in euro, laatste min eerste
  pct: number; // in procenten
  points: number;
  cheapest: PricePoint;
};

/**
 * Per vast product: eerste en laatste bekende prijs per stuk (uit bonnen), het verschil en de goedkoopste aankoop.
 * Producten met maar één meting tellen mee met verschil 0, zodat je ziet wat er al bekend is.
 */
export function priceTrends(points: PricePoint[]): PriceTrend[] {
  const by = new Map<string, PricePoint[]>();
  for (const p of points) {
    if (!(p.unit > 0)) continue;
    by.set(p.productId, [...(by.get(p.productId) ?? []), p]);
  }
  const out: PriceTrend[] = [];
  for (const [productId, list] of by) {
    const sorted = [...list].sort((a, b) => a.day.localeCompare(b.day));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const change = Math.round((last.unit - first.unit) * 100) / 100;
    const pct = first.unit ? Math.round((change / first.unit) * 1000) / 10 : 0;
    const cheapest = sorted.reduce((m, p) => (p.unit < m.unit ? p : m), first);
    out.push({ productId, first, last, change, pct, points: sorted.length, cheapest });
  }
  // Grootste stijging/daling bovenaan, daarna producten met één meting
  return out.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct) || b.points - a.points);
}

/** Zelfde winkel, datum en totaal = waarschijnlijk dezelfde bon twee keer gefotografeerd. */
export function dedupeReceipts<R extends { store_id: string | null; purchased_on: string | null; total: number | null }>(rows: R[]): R[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (!r.store_id || !r.purchased_on || r.total == null) return true;
    const k = `${r.store_id}|${r.purchased_on}|${Number(r.total)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
