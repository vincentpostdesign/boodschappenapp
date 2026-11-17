import "server-only";
import { db } from "./db";
import type { BarcodeFormat } from "./barcode";

// Klantenkaarten (Jumbo Extra's, AH Bonuskaart, …), bewaard in settings onder 'klantenkaarten'.
export type LoyaltyCard = {
  id: string;
  store: string; // winkel-id: jumbo, ah, …
  owner: "vincent" | "marleen" | "gezin";
  number: string;
  format: BarcodeFormat;
};

export const CARDS_KEY = "klantenkaarten";

export async function getCards(): Promise<LoyaltyCard[]> {
  const { data } = await db().from("settings").select("value").eq("key", CARDS_KEY).maybeSingle();
  return Array.isArray(data?.value) ? (data.value as LoyaltyCard[]) : [];
}
