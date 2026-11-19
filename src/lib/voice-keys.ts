import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db, check } from "./db";
import type { PersonId } from "./types";

// Sleutels voor inspreken via Siri / de widget (app Opdrachten). Per persoon één sleutel; we bewaren alleen de hash,
// dus een sleutel is maar één keer te zien. Een nieuwe sleutel maken maakt de oude ongeldig.
const KEY = "spraak_sleutels";
type Keys = Partial<Record<PersonId, string>>;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

async function load(): Promise<Keys> {
  const { data } = await db().from("settings").select("value").eq("key", KEY).maybeSingle();
  const v = (data as { value: unknown } | null)?.value;
  return v && typeof v === "object" ? (v as Keys) : {};
}

/** Wie hoort bij deze sleutel? */
export async function personForKey(token: string | null | undefined): Promise<PersonId | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const h = Buffer.from(hash(token), "hex");
  for (const [person, stored] of Object.entries(await load()) as [PersonId, string][]) {
    const s = Buffer.from(stored, "hex");
    if (s.length === h.length && timingSafeEqual(s, h)) return person;
  }
  return null;
}

/** Heeft deze persoon al een sleutel? */
export async function hasKey(person: PersonId): Promise<boolean> {
  return !!(await load())[person];
}

/** Nieuwe sleutel; de oude werkt daarna niet meer. Geeft de sleutel één keer terug. */
export async function newKey(person: PersonId): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  const keys = await load();
  check(await db().from("settings").upsert({ key: KEY, value: { ...keys, [person]: hash(token) } }), "sleutel opslaan");
  return token;
}

export async function revokeKey(person: PersonId): Promise<void> {
  const keys = await load();
  delete keys[person];
  check(await db().from("settings").upsert({ key: KEY, value: keys }), "sleutel intrekken");
}
