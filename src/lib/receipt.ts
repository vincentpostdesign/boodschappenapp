// Verwerking van uitgelezen bonregels (puur, zonder database): opschonen, controleren en koppelen aan aliassen.
import { normalize } from "./route";

export type RawLine = { naam: string; aantal: number; prijs: number };
export type CleanLine = { raw_name: string; quantity: number; price: number };

// Regels die geen product zijn, ook als het model ze toch meegeeft.
const NOT_A_PRODUCT = /^(sub)?totaal|^te betalen|^btw|^pin(nen|betaling)?\b|^contant|^wisselgeld|^betaald|^bankpas|^maestro|^v pay|^aantal artikelen|^spaar|^zegel|^bonus ?box/i;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Alleen-hoofdletters ("HALFV MELK 2L") wordt gewone schrijfwijze ("Halfv melk 2L").
 * Namen die al kleine letters bevatten blijven zoals ze zijn (Claude levert merknamen al met hoofdletter).
 */
export function niceCase(name: string): string {
  if (!/[A-ZÀ-Þ]/.test(name) || /[a-zß-ÿ]/.test(name)) return name;
  const lower = name.toLowerCase().replace(/(\d)l\b/g, "$1L");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Schoont uitgelezen regels op: lege/onzinnige regels weg, bedragen afgerond, aantal minstens 0,001. */
export function cleanLines(lines: RawLine[]): CleanLine[] {
  const out: CleanLine[] = [];
  for (const l of lines) {
    const name = niceCase((l.naam ?? "").replace(/\s+/g, " ").trim());
    if (!name || NOT_A_PRODUCT.test(name)) continue;
    const price = round2(Number(l.prijs));
    if (!Number.isFinite(price) || Math.abs(price) > 1000) continue;
    let qty = Number(l.aantal);
    if (!Number.isFinite(qty) || qty <= 0) qty = 1;
    out.push({ raw_name: name.slice(0, 120), quantity: Math.round(qty * 1000) / 1000, price });
  }
  return out;
}

/** Som van de regels en of die klopt met het totaal op de bon (marge 1 cent per 10 regels). */
export function checkTotal(lines: { price: number }[], total: number | null): { sum: number; matches: boolean | null; difference: number | null } {
  const sum = round2(lines.reduce((s, l) => s + l.price, 0));
  if (total == null) return { sum, matches: null, difference: null };
  const difference = round2(total - sum);
  return { sum, matches: Math.abs(difference) <= 0.01 * Math.max(1, Math.ceil(lines.length / 10)), difference };
}

/** Prijs per stuk voor de referentieprijs (null bij korting-/statiegeldregels of gewogen kleine aantallen). */
export function unitPrice(line: { quantity: number; price: number }): number | null {
  if (line.price <= 0 || line.quantity <= 0) return null;
  return round2(line.price / line.quantity);
}

/** Zoekt bij elke regel het gekoppelde vaste product via eerder geleerde aliassen van dezelfde winkel. */
export function applyAliases<L extends { raw_name: string }>(
  lines: L[],
  aliases: { alias: string; product_id: string }[],
): (L & { product_id: string | null })[] {
  const map = new Map(aliases.map((a) => [normalize(a.alias), a.product_id]));
  return lines.map((l) => ({ ...l, product_id: map.get(normalize(l.raw_name)) ?? null }));
}

const words = (s: string) => normalize(s).split(" ").filter((w) => w.length > 1);
// Enkelvoud/meervoud gelijkstellen: "bananen" ~ "banaan", "appels" ~ "appel", "kiwi s" ~ "kiwi".
const stem = (w: string) => w.replace(/(en|s)$/, "").replace(/aa(\w)$/, "a$1");

/**
 * Stelt een vast product voor bij een bonregel zonder geleerde koppeling.
 * Alle woorden van de productnaam moeten in de bonregel staan ("Kwark" ↔ "Magere kwark");
 * bij meerdere kandidaten wint wie ook de meeste woorden van de omschrijving deelt (Kwark – Magere kwark).
 * Te korte of te algemene namen leveren niets op, liever geen koppeling dan een verkeerde.
 */
export function suggestProduct(rawName: string, products: { id: string; name: string; description: string | null }[]): string | null {
  const line = new Set(words(rawName).map(stem));
  if (!line.size) return null;
  let best: { id: string; score: number } | null = null;
  let tie = false;
  for (const p of products) {
    const name = words(p.name).map(stem);
    if (!name.length || name.join("").length < 3 || !name.every((w) => line.has(w))) continue;
    const desc = words(p.description ?? "").map(stem);
    const score = name.length * 10 + desc.filter((w) => line.has(w)).length;
    if (!best || score > best.score) {
      best = { id: p.id, score };
      tie = false;
    } else if (score === best.score) tie = true;
  }
  return best && !tie ? best.id : null;
}
