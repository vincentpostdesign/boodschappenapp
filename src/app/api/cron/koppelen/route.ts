import { NextResponse, type NextRequest } from "next/server";
import { cronGuard } from "@/lib/cron";
import { relinkOffers } from "@/lib/prices/refresh";

/** Opgeslagen acties opnieuw aan vaste producten koppelen (zonder ophalen). */
export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  return NextResponse.json(await relinkOffers());
}
