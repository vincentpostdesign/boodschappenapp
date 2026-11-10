"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, check } from "@/lib/db";
import { LONG_COOKIE, PERSON_COOKIE, STORE_COOKIE, isPersonId, requirePerson } from "@/lib/session";
import { matchProduct } from "@/lib/route";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/access";
import type { Product } from "@/lib/types";

function refresh() {
  revalidatePath("/", "layout");
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

/** Vrij invoerveld. Herkent een vast product als de naam precies overeenkomt. */
export async function addFreeItem(text: string, quantity?: number) {
  const person = await requirePerson();
  const name = text.trim().replace(/\s+/g, " ");
  if (!name) return;
  if (name.length > 120) throw new Error("Naam is te lang");
  const products = check(await db().from("products").select("*").eq("hidden", false), "producten") as Product[];
  const match = matchProduct(name, products);
  if (match && (await productIdsOnList()).has(match.id)) return refresh();
  check(
    await db().from("list_items").insert({
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
