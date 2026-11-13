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
  const { data } = await db().from("settings").select("key, value").in("key", [KEY, EXTRA_KEY]);
  const rows = (data ?? []) as { key: string; value: unknown }[];
  const stored = rows.find((r) => r.key === KEY)?.value as Stored | undefined;
  const extra = (rows.find((r) => r.key === EXTRA_KEY)?.value as ScoupyDeal[] | undefined) ?? [];
  if (!stored || Date.now() - new Date(stored.at).getTime() > MAX_AGE) {
    after(() => refreshScoupy().catch(() => 0));
  }
  const now = new Date();
  const all = new Map([...(stored?.deals ?? []), ...extra].map((d) => [d.id, d]));
  return { at: stored?.at ?? null, deals: [...all.values()].filter((d) => isCurrent(d, now)).sort((a, b) => a.ends.localeCompare(b.ends)) };
}

// Acties die Marleen of Vincent zelf deelden vanuit de Scoupy-app (persoonlijke acties staan niet in de openbare lijst).
const EXTRA_KEY = "scoupy_extra";

/** Gedeelde Scoupy-actie bewaren; verlopen gedeelde acties worden meteen opgeruimd. */
export async function addSharedDeal(deal: ScoupyDeal): Promise<void> {
  const { data } = await db().from("settings").select("value").eq("key", EXTRA_KEY).maybeSingle();
  const now = new Date();
  const list = ((data?.value as ScoupyDeal[] | undefined) ?? []).filter((d) => d.id !== deal.id && new Date(d.ends) >= now);
  await db().from("settings").upsert({ key: EXTRA_KEY, value: [...list, deal] });
  await bumpVersion();
}

export async function getScoupyDeals(): Promise<ScoupyDeal[]> {
  return (await getScoupy()).deals;
}
