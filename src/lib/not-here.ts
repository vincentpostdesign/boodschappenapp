/** Waarde in de afdelingskeuze van een vast product: "Niet te koop bij deze winkel". */
export const NOT_HERE = "__niet__";

import { normalize } from "./route";

/**
 * Volgens de bonnen alleen bij andere winkels gekocht (bijv. Prodent bij de Jumbo), nooit bij deze winkel.
 * Samen met "deze winkel heeft er geen afdeling voor" betekent dat: niet te koop hier.
 */
export function onlyBoughtElsewhere(
  item: { name: string; productId?: string | null },
  storeId: string,
  boughtAt: Record<string, string[]>,
): boolean {
  const stores = new Set([...(item.productId ? (boughtAt[`p:${item.productId}`] ?? []) : []), ...(boughtAt[`n:${normalize(item.name)}`] ?? [])]);
  return stores.size > 0 && !stores.has(storeId);
}
