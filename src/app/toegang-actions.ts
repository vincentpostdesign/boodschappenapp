"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, check } from "@/lib/db";
import { ACCESS_COOKIE, ACCESS_DAYS, createAccessToken, validCode, verifyAccessToken } from "@/lib/access";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const MAX_TRIES = 5;
const WINDOW_MIN = 15;

type Stored = { salt: string; hash: string };
export type CodeState = { error?: string } | undefined;

async function storedCode(): Promise<Stored | null> {
  const row = check(await db().from("settings").select("value").eq("key", "toegangscode").maybeSingle(), "code") as { value: Stored } | null;
  return row?.value ?? null;
}

async function hashCode(code: string, salt = randomBytes(16)): Promise<Stored> {
  const hash = await scrypt(code, salt, 32);
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}

async function matches(code: string, stored: Stored): Promise<boolean> {
  const { hash } = await hashCode(code, Buffer.from(stored.salt, "hex"));
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(stored.hash, "hex"));
}

async function grantAccess() {
  (await cookies()).set(ACCESS_COOKIE, await createAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_DAYS * 86400,
  });
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "onbekend").trim().slice(0, 64);
}

export async function hasAccess(): Promise<boolean> {
  return verifyAccessToken((await cookies()).get(ACCESS_COOKIE)?.value);
}

export async function isCodeSet(): Promise<boolean> {
  return (await storedCode()) !== null;
}

/** Eerste keer: de code kiezen. Kan alleen zolang er nog geen code is. */
export async function setInitialCode(_prev: CodeState, form: FormData): Promise<CodeState> {
  const code = String(form.get("code") ?? "").trim();
  const repeat = String(form.get("herhaal") ?? "").trim();
  if (!validCode(code)) return { error: "Gebruik 4 tot 12 cijfers (6 of meer is veiliger)." };
  if (code !== repeat) return { error: "De twee codes zijn niet gelijk." };
  // insert (geen upsert): mislukt als er intussen al een code is ingesteld
  const res = await db().from("settings").insert({ key: "toegangscode", value: await hashCode(code) });
  if (res.error) return { error: "Er is al een gezinscode ingesteld. Vul die hieronder in." };
  await grantAccess();
  redirect("/kies");
}

export async function enterCode(_prev: CodeState, form: FormData): Promise<CodeState> {
  const code = String(form.get("code") ?? "").trim();
  const stored = await storedCode();
  if (!stored) redirect("/kies");
  const ip = await clientIp();
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count } = await db().from("access_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).gte("at", since);
  if ((count ?? 0) >= MAX_TRIES) return { error: `Te vaak een verkeerde code. Probeer het over ${WINDOW_MIN} minuten opnieuw.` };

  if (!validCode(code) || !(await matches(code, stored))) {
    await db().from("access_attempts").insert({ ip });
    const left = MAX_TRIES - (count ?? 0) - 1;
    return { error: left > 0 ? `Verkeerde code. Nog ${left} ${left === 1 ? "poging" : "pogingen"}.` : `Verkeerde code. Probeer het over ${WINDOW_MIN} minuten opnieuw.` };
  }
  await db().from("access_attempts").delete().eq("ip", ip);
  await grantAccess();
  redirect("/kies");
}

/** Deze telefoon afmelden: toegang en persoon vergeten. */
export async function signOutDevice() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete("persoon");
  redirect("/kies");
}

/** In Beheer: code wijzigen (alleen met toegang en de huidige code). */
export async function changeCode(
  _prev: { error?: string; ok?: boolean } | undefined,
  form: FormData,
): Promise<{ error?: string; ok?: boolean } | undefined> {
  if (!(await hasAccess())) return { error: "Geen toegang." };
  const current = String(form.get("huidig") ?? "").trim();
  const code = String(form.get("code") ?? "").trim();
  const stored = await storedCode();
  if (!stored || !(await matches(current, stored))) return { error: "De huidige code klopt niet." };
  if (!validCode(code)) return { error: "Gebruik 4 tot 12 cijfers (6 of meer is veiliger)." };
  check(await db().from("settings").update({ value: await hashCode(code) }).eq("key", "toegangscode"), "code wijzigen");
  return { ok: true };
}
