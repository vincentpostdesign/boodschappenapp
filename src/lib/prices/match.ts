// Aanbiedingen koppelen aan vaste producten en watchlist-items. Bewust voorzichtig: liever geen treffer dan een verkeerde.
import { normalize } from "../route";

const STOP = new Set([
  "de", "het", "een", "en", "of", "met", "zonder", "voor", "van", "per", "pak", "stuk", "stuks", "gewoon", "eigen", "merk",
  "vers", "verse", "heel", "hele", "ml", "l", "liter", "gram", "g", "kg", "cl", "x", "1", "2", "3", "4", "5", "500",
]);

/** Betekenisvolle woorden, met eenvoudige meervoudsvormen weggepoetst. */
export function tokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t) && !/^\d+$/.test(t))
    .map(stem);
}

function stem(t: string): string {
  if (t.endsWith("'s")) return t.slice(0, -2);
  if (t.length > 5 && t.endsWith("en")) return t.slice(0, -2); // bananen -> banan, walnoten -> walnot
  if (t.length > 4 && t.endsWith("s")) return t.slice(0, -1); // kiwis -> kiwi
  return t;
}

const has = (hay: string[], needle: string) => hay.some((h) => h === needle || (needle.length >= 5 && h.includes(needle)));

/**
 * Hoort deze aanbieding bij het vaste product?
 * - Alle woorden uit de productnaam moeten in de aanbieding staan (samenstellingen tellen mee: 'volkorenbrood' in 'tijgervolkorenbrood').
 * - Is er een omschrijving, dan moet minstens één woord daaruit ook voorkomen (anders is 'Salade' te breed).
 * - Samengestelde producten (ovenschotel, dip, drink, babyvoeding…) tellen niet, tenzij het product zelf zo heet.
 * - Hooguit 3 woorden extra naast merk en productwoorden ('Spa bruisend watermelon kiwi' is geen kiwi).
 */
export function offerMatchesProduct(
  offer: { name: string; brand: string | null; category?: string | null },
  product: { name: string; description: string | null },
  allowedCategories?: Set<string>,
): boolean {
  if (allowedCategories?.size && offer.category && !allowedCategories.has(offer.category)) return false;
  const hay = tokens(`${offer.brand ?? ""} ${offer.name}`);
  const nameT = tokens(product.name);
  if (!nameT.length || !nameT.every((t) => has(hay, t))) return false;
  const allProductT = tokens(`${product.name} ${product.description ?? ""}`);
  // Uitzondering als het woord op het product eindigt: in een samenstelling bepaalt het laatste deel wat het is
  // ('drinkyoghurt' is een yoghurt, 'mueslireep' is een reep).
  if (hay.some((h) => isBlocked(h) && !allProductT.some((p) => p.includes(h) || h.endsWith(p)))) return false;
  // Woorden die al in de naam zitten tellen niet als onderscheidend ('salad' bij 'salade'); 'boerensalade' wel.
  const descT = tokens(product.description ?? "").filter((t) => !nameT.some((n) => n.includes(t)));
  if (descT.length && !descT.some((t) => has(hay, t))) return false;
  const brandT = new Set(tokens(offer.brand ?? ""));
  const extra = hay.filter((h) => !brandT.has(h) && !allProductT.some((p) => h === p || h.includes(p) || p.includes(h)));
  return extra.length <= 3;
}

// Woorden die op een ander (samengesteld) product wijzen.
const BLOCK = [
  "ovenschotel", "maaltijd", "saus", "dip", "drink", "smoothie", "sap", "limonade", "bruisend", "spray", "maanden",
  "pizza", "pinsa", "taart", "soep", "chips", "ijs", "gratin", "geur", "shampoo", "mix", "reep", "koek", "snoep",
  "baby", "knijp", "mnd", "maanden", "ravioli", "pasta", "biscuit", "puree", "gebruiken", "smaak", "vleugje", "rep",
  // smaken: een product met smaakje is een ander product dan het gewone (tenzij het vaste product die smaak noemt)
  "vanille", "aardbei", "mango", "perzik", "stracciatella", "kaneel", "appel", "apple", "bosbes", "citroen", "chocolade",
  "choco", "karamel", "honing", "kokos", "ananas", "framboos", "passievrucht", "kers", "peer",
];
const BLOCK_STEMS = BLOCK.map((b) => stem(b));

/** Woord wijst op een ander product: begint ermee, of eindigt erop als laatste deel van een samenstelling. */
function isBlocked(h: string): boolean {
  return BLOCK_STEMS.some((b) => h.startsWith(b) || (b.length >= 3 && h.length >= b.length + 4 && h.endsWith(b)));
}

// Afdelingsnaam (deel) -> categorieën van de prijsbron die daarbij passen.
const DEPT_CATEGORIES: [string, string[]][] = [
  ["groente", ["groente-fruit"]],
  ["fruit", ["groente-fruit"]],
  ["zuivel", ["zuivel-eieren", "kaas"]],
  ["kaas", ["kaas", "zuivel-eieren"]],
  ["brood", ["brood-bakkerij"]],
  ["ontbijt", ["ontbijt"]],
  ["noten", ["snoep-koek-chips", "ontbijt"]],
  ["chips", ["snoep-koek-chips"]],
  ["zoetwaren", ["snoep-koek-chips"]],
  ["salade", ["maaltijden", "kaas", "vleeswaren"]],
  ["vleeswaren", ["vleeswaren"]],
  ["vlees", ["vlees"]],
  ["vis", ["vis"]],
  ["koffie", ["koffie-thee"]],
  ["thee", ["koffie-thee"]],
  ["bier", ["bier"]],
  ["wijn", ["wijn"]],
  ["diepvries", ["diepvries"]],
];

/** Toegestane categorieën voor een product op basis van de afdelingen waar het in staat (leeg = geen beperking). */
export function categoriesForDepartments(departmentNames: string[]): Set<string> {
  const out = new Set<string>();
  for (const name of departmentNames) {
    const n = normalize(name);
    for (const [key, cats] of DEPT_CATEGORIES) if (n.includes(key)) cats.forEach((c) => out.add(c));
  }
  return out;
}

/** Watchlist: merk (indien opgegeven) moet het merk van de aanbieding zijn, en de productnaam moet erin staan. */
export function offerMatchesWatch(
  offer: { name: string; brand: string | null },
  watch: { name: string; brand: string | null },
): boolean {
  const hay = tokens(`${offer.brand ?? ""} ${offer.name}`);
  if (watch.brand) {
    const b = tokens(watch.brand);
    // Het merkveld van de aanbieding is leidend ('Ariel pods … touch of Lenor' is geen Lenor).
    const brandHay = offer.brand ? tokens(offer.brand) : tokens(offer.name).slice(0, b.length + 1);
    if (!b.every((t) => brandHay.some((h) => h === t || h.startsWith(t)))) return false;
  }
  const words = normalize(watch.name).split(" ").filter(Boolean);
  return (
    words.length > 0 &&
    words.every((w) => has(hay, stem(w)) || (SYNONYMS[w] ?? []).some((s) => has(hay, stem(s))))
  );
}

// Op de genormaliseerde woorden van de watchlist-naam; waarden worden ook gestemd.
const SYNONYMS: Record<string, string[]> = {
  wc: ["toilet", "toiletpapier"],
  toiletpapier: ["wc", "toilet"],
  wasmiddelpods: ["pods", "capsules", "wascapsules", "caps"],
  vaatwastabletten: ["vaatwasser", "vaatwas", "vaatwascapsules", "dishwasher"],
  afwasmiddel: ["afwas"],
};

/** Is dit een goede aanbieding volgens de grenzen van het watchlist-item? */
export function isGoodDeal(
  offer: { price: number | null; discountPct: number | null },
  watch: { max_price: number | null; min_discount_pct: number | null },
): boolean {
  if (watch.max_price != null) {
    if (offer.price == null || offer.price > Number(watch.max_price)) return false;
  }
  if (watch.min_discount_pct != null) {
    if (offer.discountPct == null || offer.discountPct < watch.min_discount_pct) return false;
  }
  return true;
}
