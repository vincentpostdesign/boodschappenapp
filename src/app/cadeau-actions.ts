"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { bumpVersion } from "@/lib/version";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { OCCASIONS } from "@/lib/gifts";

function refresh() {
  revalidatePath("/beheer", "layout");
  after(bumpVersion);
}

const optText = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const giftSchema = z.object({
  name: z.string().trim().min(1, "Wat is het cadeau?").max(120),
  recipient: optText(60),
  occasion: z.enum(OCCASIONS.map((o) => o.id) as [string, ...string[]]),
  price: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(String(v).replace("€", "").replace(",", ".").trim())),
    z.number({ message: "Prijs is geen bedrag" }).min(0).max(99999).nullable(),
  ),
  link: optText(500).refine((v) => !v || /^https?:\/\//i.test(v), "Een link begint met https://"),
  note: optText(300),
  secret: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export type GiftState = { error?: string; ok?: number } | undefined;

/** Toevoegen of (met id) wijzigen. Geheime cadeaus van de ander kun je niet aanpassen. */
export async function saveGift(_prev: GiftState, formData: FormData): Promise<GiftState> {
  const me = await requirePerson();
  const id = (formData.get("id") as string) || null;
  const parsed = giftSchema.safeParse(
    Object.fromEntries(["name", "recipient", "occasion", "price", "link", "note", "secret"].map((k) => [k, formData.get(k) ?? ""])),
  );
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controleer de velden" };
  const v = parsed.data;
  if (id) {
    const own = await ownedOrShared(id, me);
    // Alleen wie het toevoegde mag 'geheim' aan/uit zetten.
    const row = own.added_by === me ? v : { ...v, secret: own.secret };
    check(await db().from("gifts").update(row).eq("id", id), "cadeau opslaan");
  } else {
    check(await db().from("gifts").insert({ ...v, added_by: me }), "cadeau toevoegen");
  }
  refresh();
  return { ok: Date.now() };
}

export async function setGiftBought(id: string, bought: boolean) {
  const me = await requirePerson();
  await ownedOrShared(id, me);
  check(await db().from("gifts").update({ bought }).eq("id", id), "cadeau bijwerken");
  refresh();
}

export async function deleteGift(id: string) {
  const me = await requirePerson();
  await ownedOrShared(id, me);
  check(await db().from("gifts").delete().eq("id", id), "cadeau verwijderen");
  refresh();
}

/** Gekochte cadeaus van één gelegenheid opruimen (bijv. na Sinterklaas). */
export async function clearBoughtGifts(occasion: string) {
  const me = await requirePerson();
  if (!OCCASIONS.some((o) => o.id === occasion)) throw new Error("Onbekende gelegenheid");
  // Geheime cadeaus van de ander blijven staan: die zie je niet, dus die ruim je ook niet op.
  check(
    await db().from("gifts").delete().eq("occasion", occasion).eq("bought", true).or(`secret.eq.false,added_by.eq.${me}`),
    "opruimen",
  );
  refresh();
}

async function ownedOrShared(id: string, me: string) {
  const row = check(await db().from("gifts").select("added_by, secret").eq("id", id).maybeSingle(), "cadeau") as {
    added_by: string;
    secret: boolean;
  } | null;
  if (!row || (row.secret && row.added_by !== me)) throw new Error("Dit cadeau bestaat niet (meer)");
  return row;
}
