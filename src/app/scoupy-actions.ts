"use server";

import { revalidatePath } from "next/cache";
import { requirePerson } from "@/lib/session";
import { dealIdFromLink, fetchScoupyDeal, isCurrent } from "@/lib/scoupy";
import { addSharedDeal } from "@/lib/scoupy-store";

export type ShareResult = { ok?: string; error?: string };

/** Een gedeelde link uit de Scoupy-app toevoegen (Delen → Kopieer link → hier plakken). */
export async function addScoupyLink(text: string): Promise<ShareResult> {
  await requirePerson();
  const id = dealIdFromLink(text ?? "");
  if (!id) return { error: "Dat is geen Scoupy-link. Tik in Scoupy bij de actie op het deel-icoon en kies Kopieer." };
  const deal = await fetchScoupyDeal(id).catch(() => null);
  if (!deal) return { error: "Deze actie kon niet worden opgehaald. Is hij misschien al afgelopen?" };
  if (!isCurrent(deal)) return { error: "Deze actie is al afgelopen." };
  await addSharedDeal(deal);
  revalidatePath("/", "layout");
  return { ok: `Toegevoegd: ${deal.product} (${deal.short || "cashback"}).` };
}
