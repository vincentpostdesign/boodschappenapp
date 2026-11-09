"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { shortDate } from "@/lib/dates";

function refresh() {
  revalidatePath("/", "layout");
}

const optNumber = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().min(min).max(max).nullable());

const watchSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(80),
  brand: z.string().trim().max(60),
  content: z.string().trim().max(60),
  ean: z.string().trim().regex(/^(\d{8}|\d{12,14})?$/, "EAN bestaat uit 8 of 13 cijfers"),
  photo_path: z.string().max(200),
  max_price: optNumber(0, 1000),
  min_discount_pct: optNumber(0, 100),
});

export type WatchFormState = { error?: string } | undefined;

export async function saveWatchItem(_prev: WatchFormState, formData: FormData): Promise<WatchFormState> {
  const person = await requirePerson();
  const id = (formData.get("id") as string) || null;
  const parsed = watchSchema.safeParse(Object.fromEntries(["name", "brand", "content", "ean", "photo_path", "max_price", "min_discount_pct"].map((k) => [k, formData.get(k) ?? ""])));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controleer de velden" };
  const v = parsed.data;
  const row = {
    name: v.name,
    brand: v.brand || null,
    content: v.content || null,
    ean: v.ean || null,
    max_price: v.max_price,
    min_discount_pct: v.min_discount_pct == null ? null : Math.round(v.min_discount_pct),
    ...(v.photo_path ? { photo_path: v.photo_path } : {}),
  };
  if (id) {
    check(await db().from("watchlist_items").update(row).eq("id", id), "watchlist opslaan");
    // Grenzen kunnen veranderd zijn: bestaande treffers opnieuw laten bepalen bij de volgende verversing.
    check(await db().from("watchlist_hits").delete().eq("watchlist_item_id", id).is("notified_at", null), "treffers");
  } else {
    check(await db().from("watchlist_items").insert({ ...row, added_by: person }), "watchlist toevoegen");
  }
  refresh();
  redirect("/watchlist");
}

export async function deleteWatchItem(id: string) {
  await requirePerson();
  check(await db().from("watchlist_items").delete().eq("id", id), "verwijderen");
  refresh();
  redirect("/watchlist");
}

export async function setWatchNotify(mode: "direct" | "wekelijks") {
  await requirePerson();
  if (mode !== "direct" && mode !== "wekelijks") throw new Error("Onbekende instelling");
  check(await db().from("settings").upsert({ key: "watchlist_notify", value: mode }), "instelling");
  refresh();
}

/** Zet de aanbieding van een treffer op de boodschappenlijst (één keer). */
export async function addHitToList(hitId: string): Promise<{ added: boolean; name: string }> {
  const person = await requirePerson();
  const hit = check(
    await db()
      .from("watchlist_hits")
      .select("id, offer:offers_cache(name, brand, store_id, price, valid_until), item:watchlist_items(name, brand)")
      .eq("id", hitId)
      .maybeSingle(),
    "treffer",
  ) as unknown as {
    offer: { name: string; brand: string | null; store_id: string; price: number | null; valid_until: string | null };
    item: { name: string; brand: string | null };
  } | null;
  if (!hit) throw new Error("Deze aanbieding bestaat niet meer");
  const store = check(await db().from("stores").select("name").eq("id", hit.offer.store_id).single(), "winkel") as { name: string };
  const name = [hit.item.brand, hit.item.name].filter(Boolean).join(" ");
  const price = hit.offer.price != null ? ` €${Number(hit.offer.price).toFixed(2).replace(".", ",")}` : "";
  const until = hit.offer.valid_until ? ` t/m ${shortDate(`${hit.offer.valid_until}T12:00:00Z`)}` : "";
  const description = `Aanbieding ${store.name}${price}${until}: ${hit.offer.name}`.slice(0, 160);

  const existing = check(
    await db().from("list_items").select("id").eq("archived", false).eq("checked", false).eq("name", name).eq("description", description).maybeSingle(),
    "lijst",
  );
  if (existing) return { added: false, name };
  check(await db().from("list_items").insert({ name, description, quantity: 1, added_by: person, store_id: hit.offer.store_id }), "toevoegen");
  refresh();
  return { added: true, name };
}
