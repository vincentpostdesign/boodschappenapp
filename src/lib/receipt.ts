// Verwerking van uitgelezen bonregels (puur, zonder database): opschonen, controleren en koppelen aan aliassen.
import { normalize } from "./route";

export type RawLine = { naam: string; aantal: number; prijs: number };
export type CleanLine = { raw_name: string; quantity: number; price: number };

// Regels die geen product zijn, ook als het model ze toch meegeeft.
const NOT_A_PRODUCT = /^(sub)?totaal|^te betalen|^btw|^pin(nen|betaling)?\b|^contant|^wisselgeld|^betaald|^bankpas|^maestro|^v pay|^aantal artikelen|^spaar|^zegel|^bonus ?box/i;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Schoont uitgelezen regels op: lege/onzinnige regels weg, bedragen afgerond, aantal minstens 0,001. */
export function cleanLines(lines: RawLine[]): CleanLine[] {
  const out: CleanLine[] = [];
  for (const l of lines) {
    const name = (l.naam ?? "").replace(/\s+/g, " ").trim();
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
