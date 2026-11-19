import "server-only";
import { db, check } from "./db";
import { matchProduct } from "./route";
import { parseQuantity } from "./quantity";
import { getProducts } from "./data";
import type { PersonId } from "./types";

export async function productIdsOnList(): Promise<Set<string>> {
  const rows = check(
    await db().from("list_items").select("product_id").eq("archived", false).eq("checked", false).not("product_id", "is", null),
    "lijst",
  ) as { product_id: string }[];
  return new Set(rows.map((r) => r.product_id));
}

/**
 * Eén vrij ingetypte (of ingesproken) regel op de lijst zetten. Haalt een aantal uit de tekst ("2x salade") en herkent
 * een vast product op naam. Staat dat product al op de lijst, dan wordt alleen het aantal bijgewerkt.
 * Geeft de naam terug zoals hij op de lijst staat (of null als er niets te doen was).
 */
export async function insertFreeItem(person: PersonId, text: string, quantity?: number, clientId?: string): Promise<string | null> {
  // Offline toegevoegd en later (mogelijk twee keer) verstuurd: met hetzelfde id komt het er maar één keer op.
  const id = clientId && /^[0-9a-f-]{36}$/i.test(clientId) ? clientId : undefined;
  if (id && check(await db().from("list_items").select("id").eq("id", id).maybeSingle(), "lijst")) return null;
  const parsed = parseQuantity(text);
  const name = parsed.name;
  quantity ??= parsed.quantity ?? undefined;
  if (!name) return null;
  if (name.length > 120) throw new Error("Naam is te lang");
  const products = await getProducts();
  const match = matchProduct(name, products);
  if (match && (await productIdsOnList()).has(match.id)) {
    if (quantity) {
      const q = Math.max(1, Math.min(99, Math.round(quantity)));
      check(
        await db().from("list_items").update({ quantity: q }).eq("product_id", match.id).eq("archived", false).eq("checked", false),
        "aantal",
      );
    }
    return match.name;
  }
  const finalName = match?.name ?? name.charAt(0).toUpperCase() + name.slice(1);
  check(
    await db().from("list_items").insert({
      ...(id ? { id } : {}),
      product_id: match?.id ?? null,
      name: finalName,
      description: match?.description ?? null,
      quantity: quantity ? Math.max(1, Math.min(99, Math.round(quantity))) : (match?.default_quantity ?? 1),
      added_by: person,
    }),
    "toevoegen",
  );
  return finalName;
}
