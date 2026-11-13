"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { bumpVersion } from "@/lib/version";
import { redirect } from "next/navigation";
import { db, check } from "@/lib/db";
import { LONG_COOKIE, PERSON_COOKIE, STORE_COOKIE, isPersonId, requirePerson } from "@/lib/session";
import { matchProduct } from "@/lib/route";
import { parseQuantity } from "@/lib/quantity";
import { getProducts } from "@/lib/data";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/access";
import type { Product } from "@/lib/types";
import { isCategory } from "@/lib/categories";
import { remember } from "@/lib/categorize";

function refresh() {
  revalidatePath("/", "layout");
  after(bumpVersion); // open apps (bijv. die van Marleen) verversen zichzelf
}

// ---------- wie ben ik / winkel ----------

export async function choosePerson(formData: FormData) {
  if (!(await verifyAccessToken((await cookies()).get(ACCESS_COOKIE)?.value))) redirect("/kies");
  const id = formData.get("person");
  if (!isPersonId(id)) throw new Error("Onbekende persoon");
  (await cookies()).set(PERSON_COOKIE, id, LONG_COOKIE);
  redirect("/");
}

export async function chooseStore(storeId: string) {
  await requirePerson();
  const exists = check(await db().from("stores").select("id").eq("id", storeId).maybeSingle(), "winkel");
  if (!exists) throw new Error("Onbekende winkel");
  (await cookies()).set(STORE_COOKIE, storeId, LONG_COOKIE);
  refresh();
}

// ---------- lijst ----------

async function productIdsOnList(): Promise<Set<string>> {
  const rows = check(
    await db().from("list_items").select("product_id").eq("archived", false).eq("checked", false).not("product_id", "is", null),
    "lijst",
  ) as { product_id: string }[];
  return new Set(rows.map((r) => r.product_id));
}

/**
 * Vrij invoerveld. Haalt een aantal uit de tekst ("2x salade", "3 appels") en herkent een vast product
 * als de naam precies overeenkomt. Staat dat product al op de lijst, dan wordt alleen het aantal bijgewerkt.
 */
export async function addFreeItem(text: string, quantity?: number, clientId?: string) {
  const person = await requirePerson();
  // Offline toegevoegd en later (mogelijk twee keer) verstuurd: met hetzelfde id komt het er maar één keer op.
  const id = clientId && /^[0-9a-f-]{36}$/i.test(clientId) ? clientId : undefined;
  if (id && check(await db().from("list_items").select("id").eq("id", id).maybeSingle(), "lijst")) return;
  const parsed = parseQuantity(text);
  const name = parsed.name;
  quantity ??= parsed.quantity ?? undefined;
  if (!name) return;
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
    return refresh();
  }
  check(
    await db().from("list_items").insert({
      ...(id ? { id } : {}),
      product_id: match?.id ?? null,
      name: match?.name ?? name.charAt(0).toUpperCase() + name.slice(1),
      description: match?.description ?? null,
      quantity: quantity ? Math.max(1, Math.min(99, Math.round(quantity))) : (match?.default_quantity ?? 1),
      added_by: person,
    }),
    "toevoegen",
  );
  refresh();
}

export async function addProducts(productIds: string[]) {
  const person = await requirePerson();
  if (!productIds.length) return;
  const onList = await productIdsOnList();
  const todo = productIds.filter((id) => !onList.has(id));
  if (!todo.length) return refresh();
  const products = check(await db().from("products").select("*").in("id", todo), "producten") as Product[];
  check(
    await db().from("list_items").insert(
      products.map((p) => ({
        product_id: p.id,
        name: p.name,
        description: p.description,
        quantity: p.default_quantity,
        added_by: person,
      })),
    ),
    "toevoegen",
  );
  refresh();
}

/**
 * Aantal van een vast product op de lijst direct zetten (vanuit Vast).
 * 0 = van de lijst halen; anders bijwerken of toevoegen. Werkt op de nog niet afgevinkte regel.
 */
export async function setProductQuantity(productId: string, quantity: number) {
  const person = await requirePerson();
  const q = Math.max(0, Math.min(99, Math.round(quantity)));
  const existing = check(
    await db().from("list_items").select("id").eq("product_id", productId).eq("archived", false).eq("checked", false).limit(1).maybeSingle(),
    "lijst",
  ) as { id: string } | null;
  if (q === 0) {
    if (existing) check(await db().from("list_items").delete().eq("id", existing.id), "verwijderen");
  } else if (existing) {
    check(await db().from("list_items").update({ quantity: q }).eq("id", existing.id), "aantal");
  } else {
    const p = check(await db().from("products").select("name, description").eq("id", productId).single(), "product") as {
      name: string;
      description: string | null;
    };
    check(await db().from("list_items").insert({ product_id: productId, name: p.name, description: p.description, quantity: q, added_by: person }), "toevoegen");
  }
  refresh();
}

export async function addAllFixedProducts() {
  await requirePerson();
  const ids = check(await db().from("products").select("id").eq("hidden", false), "producten") as { id: string }[];
  await addProducts(ids.map((r) => r.id));
}

export async function setChecked(itemId: string, checked: boolean) {
  const person = await requirePerson();
  check(
    await db()
      .from("list_items")
      .update(checked ? { checked: true, checked_at: new Date().toISOString(), checked_by: person } : { checked: false, checked_at: null, checked_by: null })
      .eq("id", itemId),
    "afvinken",
  );
  refresh();
}

export async function setQuantity(itemId: string, quantity: number) {
  await requirePerson();
  const q = Math.max(1, Math.min(99, Math.round(quantity)));
  check(await db().from("list_items").update({ quantity: q }).eq("id", itemId), "aantal");
  refresh();
}

export async function removeItem(itemId: string) {
  await requirePerson();
  check(await db().from("list_items").delete().eq("id", itemId).eq("archived", false), "verwijderen");
  refresh();
}

/** Naam en opmerking van een regel op de lijst wijzigen (alleen deze regel, niet het vaste product). */
export async function editItem(itemId: string, name: string, note: string) {
  await requirePerson();
  const n = name.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!n) throw new Error("Naam is verplicht");
  const d = note.trim().replace(/\s+/g, " ").slice(0, 160);
  check(await db().from("list_items").update({ name: n, description: d || null }).eq("id", itemId).eq("archived", false), "wijzigen");
  refresh();
}

/** Losse regel met de hand naar een andere afdeling; de app onthoudt dat voor deze naam. */
export async function setItemCategory(itemId: string, category: string) {
  await requirePerson();
  if (!isCategory(category)) throw new Error("Onbekende afdeling");
  const row = check(await db().from("list_items").select("name").eq("id", itemId).maybeSingle(), "regel") as { name: string } | null;
  if (!row) return;
  check(await db().from("list_items").update({ category }).eq("id", itemId), "afdeling");
  await remember(row.name, category, "hand");
  refresh();
}
