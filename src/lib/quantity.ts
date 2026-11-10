// Aantal uit vrij ingetypte tekst halen: "2x salade", "salade x2", "3 appels" → { quantity, name }.

const UNITS = /^(g|gr|gram|kg|kilo|mg|ml|cl|dl|l|ltr|liter|liters|stuks?|st|pak|pakken|zak|zakken|blik|blikken|fles|flessen|pot|potten|doos|dozen|%|cm|mm|m)\b/i;
const MAX = 99;

export function parseQuantity(input: string): { quantity: number | null; name: string } {
  const text = input.trim().replace(/\s+/g, " ");

  // "2x salade", "2 x salade", "2× salade", "2* salade"
  let m = text.match(/^(\d{1,2})\s*[x×*]\s+(.+)$/i) ?? text.match(/^(\d{1,2})[x×*](\S.*)$/i);
  if (m) return result(m[1], m[2]);

  // "salade 2x", "salade x2", "salade 2 x", "salade ×2"
  m = text.match(/^(.+?)\s+(?:(\d{1,2})\s*[x×*]|[x×*]\s*(\d{1,2}))$/i);
  if (m) return result(m[2] ?? m[3], m[1]);

  // "3 appels" (maar niet "500 gram gehakt" of "1,5 l cola")
  m = text.match(/^(\d{1,2})\s+(.+)$/);
  if (m && !UNITS.test(m[2]) && Number(m[1]) <= 20) return result(m[1], m[2]);

  return { quantity: null, name: text };
}

function result(n: string, name: string) {
  const q = Number(n);
  if (!Number.isFinite(q) || q < 1) return { quantity: null, name: name.trim() };
  return { quantity: Math.min(MAX, q), name: name.trim() };
}
