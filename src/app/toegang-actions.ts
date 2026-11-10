"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, check } from "@/lib/db";
import { ACCESS_COOKIE, ACCESS_DAYS, createAccessToken, validCode, verifyAccessToken } from "@/lib/access";
import { LONG_COOKIE, PERSON_COOKIE, isPersonId } from "@/lib/session";
import type { PersonId } from "@/lib/types";

// Ieder een eigen code: wie zijn code invult is meteen herkend (geen "Wie ben jij?" meer).
// Codes staan als scrypt-hash in settings: 'toegangscode_vincent' en 'toegangscode_marleen'.
// De eerdere gezinscode ('toegangscode') telt als de code van Vincent.

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const MAX_TRIES = 5;
const WINDOW_MIN = 15;
const PEOPLE: PersonId[] = ["vincent", "marleen"];
const CODE_HINT = "Gebruik 4 tot 12 cijfers (6 of meer is veiliger).";

type Stored = { salt: string; hash: string };
export type CodeState = { error?: string; ok?: boolean } | undefined;

async function storedCodes(): Promise<Partial<Record<PersonId, Stored>>> {
  const rows = check(
    await db().from("settings").select("key, value").in("key", ["toegangscode", "toegangscode_vincent", "toegangscode_marleen"]),
    "codes",
  ) as { key: string; value: Stored }[];
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  return { vincent: get("toegangscode_vincent") ?? get("toegangscode"), marleen: get("toegangscode_marleen") };
}

async function saveCode(person: PersonId, code: string) {
  check(await db().from("settings").upsert({ key: `toegangscode_${person}`, value: await hashCode(code) }), "code opslaan");
  if (person === "vincent") await db().from("settings").delete().eq("key", "toegangscode"); // oude gezinscode opruimen
}

async function hashCode(code: string, salt = randomBytes(16)): Promise<Stored> {
  const hash = await scrypt(code, salt, 32);
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}

async function matches(code: string, stored: Stored): Promise<boolean> {
  const { hash } = await hashCode(code, Buffer.from(stored.salt, "hex"));
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(stored.hash, "hex"));
}

async function grantAccess(person: PersonId) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, await createAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_DAYS * 86400,
  });
  jar.set(PERSON_COOKIE, person, LONG_COOKIE);
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "onbekend").trim().slice(0, 64);
}

export async function hasAccess(): Promise<boolean> {
  return verifyAccessToken((await cookies()).get(ACCESS_COOKIE)?.value);
}

/** Welke personen hebben al een code? */
export async function codeStatus(): Promise<Record<PersonId, boolean>> {
  const c = await storedCodes();
  return { vincent: Boolean(c.vincent), marleen: Boolean(c.marleen) };
}

/** Allereerste keer (nog geen enkele code): kies wie je bent en je code. */
export async function setInitialCode(_prev: CodeState, form: FormData): Promise<CodeState> {
  const person = form.get("person");
  const code = String(form.get("code") ?? "").trim();
  const repeat = String(form.get("herhaal") ?? "").trim();
  if (!isPersonId(person)) return { error: "Kies wie je bent." };
  if (!validCode(code)) return { error: CODE_HINT };
  if (code !== repeat) return { error: "De twee codes zijn niet gelijk." };
  const status = await codeStatus();
  if (status.vincent || status.marleen) return { error: "Er is al een code ingesteld. Vul je eigen code in." };
  // insert (geen upsert): mislukt als iemand anders net tegelijk een code instelde
  const res = await db().from("settings").insert({ key: `toegangscode_${person}`, value: await hashCode(code) });
  if (res.error) return { error: "Er is al een code ingesteld. Vul je eigen code in." };
  await grantAccess(person);
  redirect("/");
}

/** Code invullen: herkent aan de code wie je bent. */
export async function enterCode(_prev: CodeState, form: FormData): Promise<CodeState> {
  const code = String(form.get("code") ?? "").trim();
  const codes = await storedCodes();
  const ip = await clientIp();
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count } = await db().from("access_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).gte("at", since);
  if ((count ?? 0) >= MAX_TRIES) return { error: `Te vaak een verkeerde code. Probeer het over ${WINDOW_MIN} minuten opnieuw.` };

  let who: PersonId | null = null;
  if (validCode(code)) {
    for (const p of PEOPLE) {
      const s = codes[p];
      if (s && (await matches(code, s))) who = p;
    }
  }
  if (!who) {
    await db().from("access_attempts").insert({ ip });
    const left = MAX_TRIES - (count ?? 0) - 1;
    return { error: left > 0 ? `Verkeerde code. Nog ${left} ${left === 1 ? "poging" : "pogingen"}.` : `Verkeerde code. Probeer het over ${WINDOW_MIN} minuten opnieuw.` };
  }
  await db().from("access_attempts").delete().eq("ip", ip);
  await grantAccess(who);
  redirect("/");
}

/** Deze telefoon afmelden: toegang en persoon vergeten. */
export async function signOutDevice() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(PERSON_COOKIE);
  redirect("/kies");
}

/** In Beheer: je eigen code wijzigen (met je huidige code). */
export async function changeOwnCode(_prev: CodeState, form: FormData): Promise<CodeState> {
  if (!(await hasAccess())) return { error: "Geen toegang." };
  const me = (await cookies()).get(PERSON_COOKIE)?.value;
  if (!isPersonId(me)) return { error: "Kies eerst wie je bent." };
  const current = String(form.get("huidig") ?? "").trim();
  const code = String(form.get("code") ?? "").trim();
  const stored = (await storedCodes())[me];
  if (!stored || !(await matches(current, stored))) return { error: "Je huidige code klopt niet." };
  if (!validCode(code)) return { error: CODE_HINT };
  await saveCode(me, code);
  return { ok: true };
}

/** In Beheer: de eerste code instellen voor iemand die er nog geen heeft (bijv. Marleen). */
export async function setCodeFor(_prev: CodeState, form: FormData): Promise<CodeState> {
  if (!(await hasAccess())) return { error: "Geen toegang." };
  const person = form.get("person");
  const code = String(form.get("code") ?? "").trim();
  if (!isPersonId(person)) return { error: "Onbekende persoon." };
  if ((await storedCodes())[person]) return { error: "Die persoon heeft al een code." };
  if (!validCode(code)) return { error: CODE_HINT };
  await saveCode(person, code);
  revalidatePath("/beheer");
  return { ok: true };
}
