import { NextResponse } from "next/server";
import { currentPerson, PEOPLE } from "@/lib/session";
import { openItemCount, productenTekst, sendToPerson } from "@/lib/push";

/** Testknop: stuurt een melding naar je eigen apparaten. */
export async function POST() {
  const person = await currentPerson();
  if (!person) return NextResponse.json({ error: "Kies eerst wie je bent" }, { status: 401 });
  const n = await openItemCount();
  const sent = await sendToPerson(person, {
    title: "Testmelding",
    body: `Hoi ${PEOPLE[person].name}, meldingen werken. Er staan ${productenTekst(n)} op de lijst.`,
    url: "/",
    tag: "test",
  });
  return NextResponse.json({ sent });
}
