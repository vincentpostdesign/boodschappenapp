import { NextResponse, type NextRequest } from "next/server";
import { db, check } from "@/lib/db";
import { cronGuard } from "@/lib/cron";
import { todayNL } from "@/lib/dates";
import { openItemCount, productenTekst, sendToPerson } from "@/lib/push";
import type { PersonId } from "@/lib/types";

/** Ochtendherinnering (8:00) voor wie vandaag de boodschappen doet. Eén keer per dag. */
export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const day = todayNL();
  const row = check(await db().from("shopper_days").select("person_id, reminded_at").eq("day", day).maybeSingle(), "planning") as {
    person_id: PersonId;
    reminded_at: string | null;
  } | null;
  if (!row) return NextResponse.json({ day, skipped: "niemand aangewezen" });
  if (row.reminded_at) return NextResponse.json({ day, skipped: "al herinnerd" });

  const n = await openItemCount();
  const sent = await sendToPerson(row.person_id, {
    title: "Jij doet vandaag de boodschappen",
    body: n ? `Er staan ${productenTekst(n)} op de lijst.` : "De lijst is nog leeg.",
    url: "/",
    tag: `herinnering-${day}`,
  });
  check(await db().from("shopper_days").update({ reminded_at: new Date().toISOString() }).eq("day", day), "herinnerd");
  return NextResponse.json({ day, person: row.person_id, items: n, sent });
}
