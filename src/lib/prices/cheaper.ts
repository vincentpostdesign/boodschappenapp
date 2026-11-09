// "Goedkoper elders": alleen tonen als er bij de standaardwinkel én bij een andere winkel een prijs bekend is.

export type KnownPrice = { product_id: string; store_id: string; price: number };

export function cheaperElsewhere(
  productId: string,
  defaultStoreId: string,
  prices: KnownPrice[],
  storeNames: Record<string, string>,
): { storeId: string; storeName: string; difference: number } | null {
  const own = prices.filter((p) => p.product_id === productId);
  const base = own.find((p) => p.store_id === defaultStoreId);
  if (!base) return null; // zonder prijs bij de standaardwinkel valt er niets te vergelijken
  let best: KnownPrice | null = null;
  for (const p of own) {
    if (p.store_id === defaultStoreId) continue;
    if (!best || p.price < best.price) best = p;
  }
  if (!best) return null;
  const difference = Math.round((Number(base.price) - Number(best.price)) * 100) / 100;
  if (difference < 0.01) return null;
  return { storeId: best.store_id, storeName: storeNames[best.store_id] ?? best.store_id, difference };
}
