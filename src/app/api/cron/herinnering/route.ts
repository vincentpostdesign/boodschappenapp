import { NextResponse, type NextRequest } from "next/server";
import { db, check } from "@/lib/db";
import { cronGuard } from "@/lib/cron";
import { todayNL } from "@/lib/dates";
import { getShopper } from "@/lib/data";
import { openItemCount, productenTekst, sendToPerson } from "@/lib/push";

/**
 * Herinneringen voor wie volgens het weekrooster vandaag de boodschappen doet.
 * - ?moment=ochtend (8:00): altijd, met het aantal producten.
 * - ?moment=middag (15:00): nog een keer, alleen als er nog iets te halen is.
 * shopper_days is het logboek, zodat elke herinnering per dag maar één keer uitgaat
 * (reminded_at = ochtend, notified_at = middag).
 */
export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const moment = req.nextUrl.searchParams.get("moment") === "middag" ? "middag" : "ochtend";
  const column = moment === "middag" ? "notified_at" : "reminded_at";
  // Vercel plant in UTC; de taak draait op beide mogelijke uren en gaat alleen door op 8:00 / 15:00 Nederlandse tijd.
  // Met ?nu=1 (handmatig testen) wordt het uur overgeslagen.
  const wantHour = moment === "middag" ? 15 : 8;
  const hourNL = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Amsterdam" }).format(new Date()));
  if (req.nextUrl.searchParams.get("nu") !== "1" && hourNL !== wantHour) {
    return NextResponse.json({ moment, skipped: `het is ${hourNL}:00 in Nederland, niet ${wantHour}:00` });
  }
  const day = todayNL();
  const person = await getShopper(day);
  if (!person) return NextResponse.json({ day, moment, skipped: "niemand ingeroosterd" });

  const log = check(await db().from("shopper_days").select("reminded_at, notified_at").eq("day", day).maybeSingle(), "logboek") as {
    reminded_at: string | null;
    notified_at: string | null;
  } | null;
  if (log?.[column]) return NextResponse.json({ day, moment, skipped: "al herinnerd" });

  const n = await openItemCount();
  if (moment === "middag" && n === 0) return NextResponse.json({ day, moment, skipped: "niets meer te halen" });

  const sent = await sendToPerson(
    person,
    moment === "ochtend"
      ? {
          title: "Jij doet vandaag de boodschappen",
          body: n ? `Er staan ${productenTekst(n)} op de lijst.` : "De lijst is nog leeg.",
          url: "/",
          tag: `herinnering-${day}`,
        }
      : {
          title: "Denk je aan de boodschappen?",
          body: `Er staan nog ${productenTekst(n)} op de lijst.`,
          url: "/",
          tag: `herinnering-middag-${day}`,
        },
  );
  check(await db().from("shopper_days").upsert({ day, person_id: person, [column]: new Date().toISOString() }), "logboek bijwerken");
  return NextResponse.json({ day, moment, person, items: n, sent });
}
