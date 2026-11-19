// Ingesproken boodschappen ("twee pakken melk, kaas en drie appels") omzetten naar losse regels.
// Dit is het vangnet zonder Claude: splitsen op komma's, "en", "ook nog" enz. en telwoorden herkennen.

const WORDS: Record<string, number> = {
  een: 1, één: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12,
};
// Verpakkingen die we weglaten als ze direct na het aantal komen: "twee pakken melk" → 2 × melk.
const PACK = /^(pak|pakken|pakje|pakjes|zak|zakken|zakje|zakjes|fles|flessen|flesje|flesjes|blik|blikken|blikje|blikjes|pot|potten|potje|potjes|doos|dozen|doosje|doosjes|stuks?|keer|bakje|bakjes|bak|bakken|rol|rollen|tros|trossen|krat|kratten)\s+/i;

export type Spoken = { name: string; quantity: number };

export function splitSpoken(text: string): Spoken[] {
  const cleaned = text
    .replace(/[.!?;]+/g, ",")
    .replace(/\b(ik wil|we hebben|wij hebben|we moeten|zet op de lijst|op de lijst|nodig|graag|alsjeblieft|ook nog|nog|ook)\b/gi, ",")
    .replace(/\s+(en|plus)\s+/gi, ",");
  const out: Spoken[] = [];
  for (const raw of cleaned.split(/[,\n]+/)) {
    let part = raw.trim().replace(/^(en|plus|dan|verder|ook)\s+/i, "").trim();
    if (!part) continue;
    let quantity = 1;
    const num = part.match(/^(\d{1,2})(?![\d,.])\s*(?:x\s+)?(.+)$/i);
    const word = part.match(/^(\S+)\s+(.+)$/);
    if (num && !/^(g|gr|gram|kg|kilo|ml|cl|l|liter)\b/i.test(num[2])) {
      quantity = Number(num[1]);
      part = num[2];
    } else if (word && WORDS[word[1].toLowerCase()] && !/^(paar|beetje)\b/i.test(word[2])) {
      quantity = WORDS[word[1].toLowerCase()];
      part = word[2];
    }
    part = part.replace(PACK, "").trim();
    if (part.length < 2) continue;
    out.push({ name: part.charAt(0).toUpperCase() + part.slice(1), quantity: Math.max(1, Math.min(99, quantity)) });
  }
  return out;
}

/** Als regeltekst voor de lijst: "2x Melk" (de lijst haalt het aantal er zelf weer uit). */
export const asLine = (s: Spoken) => (s.quantity > 1 ? `${s.quantity}x ${s.name}` : s.name);
