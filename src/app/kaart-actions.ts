"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { bumpVersion } from "@/lib/version";
import { CARDS_KEY, getCards, type LoyaltyCard } from "@/lib/cards";
import { encode, pickFormat, type BarcodeFormat } from "@/lib/barcode";

export type CardState = { error?: string; ok?: number } | undefined;

async function store(cards: LoyaltyCard[]) {
  check(await db().from("settings").upsert({ key: CARDS_KEY, value: cards }), "klantenkaarten");
  revalidatePath("/", "layout");
  after(bumpVersion);
}

/** Pas toevoegen of wijzigen. Het nummer wordt als barcode getekend; het formaat kiest de app zelf. */
export async function saveCard(_prev: CardState, formData: FormData): Promise<CardState> {
  await requirePerson();
  const id = String(formData.get("id") || "") || crypto.randomUUID();
  // Supermarkt uit de lijst, of een andere winkel met eigen naam (Karwei, IKEA, HEMA, …)
  const choice = String(formData.get("store") || "");
  const other = String(formData.get("store_name") || "").trim().replace(/\s+/g, " ").slice(0, 40);
  const owner = String(formData.get("owner") || "gezin");
  const number = String(formData.get("number") || "").replace(/\s+/g, "").toUpperCase();
  const forced = String(formData.get("format") || "") as BarcodeFormat | "";
  if (!choice) return { error: "Kies de winkel." };
  if (choice === "__anders__" && !other) return { error: "Vul de naam van de winkel in." };
  if (!["vincent", "marleen", "gezin"].includes(owner)) return { error: "Kies van wie de pas is." };
  if (!/^[0-9A-Z-]{4,60}$/.test(number)) return { error: "Vul het nummer onder de code in (alleen cijfers en letters)." };
  let storeId = choice;
  if (choice !== "__anders__") {
    const known = check(await db().from("stores").select("id").eq("id", choice).maybeSingle(), "winkel");
    if (!known) return { error: "Onbekende winkel." };
  } else {
    storeId = `anders:${other}`;
  }
  const format: BarcodeFormat = forced === "code128" || forced === "ean13" || forced === "qr" ? forced : pickFormat(number);
  try {
    encode(number, format);
  } catch {
    return { error: format === "ean13" ? "Dit nummer is geen geldige EAN-code. Kies Code 128 of controleer het nummer." : "Dit nummer kan niet als barcode worden getekend." };
  }
  const cards = (await getCards()).filter((c) => c.id !== id);
  await store([...cards, { id, store: storeId, owner: owner as LoyaltyCard["owner"], number, format }]);
  return { ok: Date.now() };
}

export async function deleteCard(id: string) {
  await requirePerson();
  await store((await getCards()).filter((c) => c.id !== id));
}
