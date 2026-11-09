import "server-only";
import * as webpush from "web-push";
import { db, check } from "./db";
import type { PersonId } from "./types";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  actions?: { action: string; title: string }[];
};

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:beheer@example.com", pub, priv);
  configured = true;
  return true;
}

/** Stuurt een melding naar alle apparaten van één persoon. Geeft het aantal geslaagde verzendingen terug. */
export async function sendToPerson(person: PersonId, payload: PushPayload): Promise<number> {
  if (!configure()) {
    console.warn("[push] VAPID-sleutels ontbreken; melding niet verstuurd:", payload.title);
    return 0;
  }
  const subs = check(
    await db().from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("person_id", person),
    "abonnementen",
  ) as { id: string; endpoint: string; p256dh: string; auth: string }[];

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12 },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410: abonnement bestaat niet meer (app verwijderd of meldingen uitgezet)
        if (status === 404 || status === 410) await db().from("push_subscriptions").delete().eq("id", s.id);
        else console.error("[push] verzenden mislukt", status, (e as Error).message);
      }
    }),
  );
  return sent;
}

export async function openItemCount(): Promise<number> {
  const { count } = await db()
    .from("list_items")
    .select("id", { count: "exact", head: true })
    .eq("archived", false)
    .eq("checked", false);
  return count ?? 0;
}

export function productenTekst(n: number) {
  return n === 1 ? "1 product" : `${n} producten`;
}
