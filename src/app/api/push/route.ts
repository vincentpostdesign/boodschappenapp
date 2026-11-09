import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db, check } from "@/lib/db";
import { currentPerson } from "@/lib/session";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Abonnement van dit apparaat opslaan (of overzetten naar de huidige persoon). */
export async function POST(req: NextRequest) {
  const person = await currentPerson();
  if (!person) return NextResponse.json({ error: "Kies eerst wie je bent" }, { status: 401 });
  const parsed = subSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldig abonnement" }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  check(
    await db().from("push_subscriptions").upsert({ person_id: person, endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: "endpoint" }),
    "abonnement opslaan",
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const person = await currentPerson();
  if (!person) return NextResponse.json({ error: "Kies eerst wie je bent" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) return NextResponse.json({ error: "Endpoint ontbreekt" }, { status: 400 });
  check(await db().from("push_subscriptions").delete().eq("endpoint", body.endpoint).eq("person_id", person), "abonnement wissen");
  return NextResponse.json({ ok: true });
}
