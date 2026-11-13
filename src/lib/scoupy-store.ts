import "server-only";
import { after } from "next/server";
import { db } from "./db";
import { fetchScoupyDeals, isCurrent, type ScoupyDeal } from "./scoupy";
import { bumpVersion } from "./version";

// Scoupy-acties worden bewaard in de instellingentabel (sleutel 'scoupy'), zodat er geen eigen tabel nodig is.
const KEY = "scoupy";
const MAX_AGE = 2 * 3600_000; // Scoupy start acties vaak om 9:00; om de 2 uur kijken is ruim genoeg

type Stored = { at: string; deals: ScoupyDeal[] };

let refreshing: Promise<number> | null = null;

/** Haalt de acties opnieuw op en bewaart ze. Geeft het aantal lopende acties terug. */
export function refreshScoupy(): Promise<number> {
  refreshing ??= (async () => {
    try {
      const deals = await fetchScoupyDeals();
      const { data } = await db().from("settings").select("value").eq("key", KEY).maybeSingle();
      const old = (data?.value as Stored | undefined)?.deals ?? [];
      // Lukt het uitlezen niet (Scoupy veranderde de pagina), dan de oude gegevens laten staan.
      if (!deals.length && old.length) return 0;
      await db().from("settings").upsert({ key: KEY, value: { at: new Date().toISOString(), deals } satisfies Stored });
      const changed = JSON.stringify(old.map((d) => d.id).sort()) !== JSON.stringify(deals.map((d) => d.id).sort());
      if (changed) await bumpVersion();
      return deals.filter((d) => isCurrent(d)).length;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Lopende Scoupy-acties en wanneer ze zijn opgehaald; ouder dan 2 uur → op de achtergrond verversen. */
export async function getScoupy(): Promise<{ at: string | null; deals: ScoupyDeal[] }> {
  const { data } = await db().from("settings").select("value").eq("key", KEY).maybeSingle();
  const stored = data?.value as Stored | undefined;
  if (!stored || Date.now() - new Date(stored.at).getTime() > MAX_AGE) {
    after(() => refreshScoupy().catch(() => 0));
  }
  const now = new Date();
  return { at: stored?.at ?? null, deals: (stored?.deals ?? []).filter((d) => isCurrent(d, now)).sort((a, b) => a.ends.localeCompare(b.ends)) };
}

export async function getScoupyDeals(): Promise<ScoupyDeal[]> {
  return (await getScoupy()).deals;
}
