import { NextResponse, type NextRequest } from "next/server";
import { db, check } from "@/lib/db";
import { cronGuard } from "@/lib/cron";
import { todayNL } from "@/lib/dates";
import { getShopper } from "@/lib/data";
import { openItemCount, productenTekst, sendToPerson } from "@/lib/push";

/**
 * Ochtendherinnering (8:00) voor wie volgens het weekrooster vandaag de boodschappen doet.
 * shopper_days dient als logboek, zodat er per dag maar één herinnering uitgaat.
 */
export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const day = todayNL();
  const person = await getShopper(day);
  if (!person) return NextResponse.json({ day, skipped: "niemand ingeroosterd" });

  const log = check(await db().from("shopper_days").select("reminded_at").eq("day", day).maybeSingle(), "logboek") as {
    reminded_at: string | null;
  } | null;
  if (log?.reminded_at) return NextResponse.json({ day, skipped: "al herinnerd" });

  const n = await openItemCount();
  const sent = await sendToPerson(person, {
    title: "Jij doet vandaag de boodschappen",
    body: n ? `Er staan ${productenTekst(n)} op de lijst.` : "De lijst is nog leeg.",
    url: "/",
    tag: `herinnering-${day}`,
  });
  check(
    await db().from("shopper_days").upsert({ day, person_id: person, reminded_at: new Date().toISOString() }),
    "logboek bijwerken",
  );
  return NextResponse.json({ day, person, items: n, sent });
}
