import "server-only";
import { db } from "./db";

// Eén versienummer voor "er is iets veranderd". Open apps vragen het elke paar seconden op
// en verversen zichzelf als het hoger is geworden (wat Marleen toevoegt staat zo ook bij Vincent).

export async function bumpVersion(): Promise<void> {
  await db().from("settings").upsert({ key: "versie", value: Date.now() });
}

export async function getVersion(): Promise<number> {
  const { data } = await db().from("settings").select("value").eq("key", "versie").maybeSingle();
  return Number((data as { value: unknown } | null)?.value ?? 0) || 0;
}
