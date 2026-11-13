import { NextResponse, type NextRequest } from "next/server";
import { cronGuard } from "@/lib/cron";
import { notifyWatchHits, refreshOffers } from "@/lib/prices/refresh";
import { refreshScoupy } from "@/lib/scoupy-store";

export const maxDuration = 300; // bulk-limiet PrijsProfeet: ophalen duurt 1 à 2 minuten

/** Dagelijks: acties ophalen, koppelen aan vaste producten en watchlist, meldingen sturen. */
export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const scoupy = await refreshScoupy().catch((e) => `mislukt: ${(e as Error).message}`);
  const refreshed = await refreshOffers();
  const notified = await notifyWatchHits();
  return NextResponse.json({ refreshed, notified, scoupy });
}
