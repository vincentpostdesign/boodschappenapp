import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PersonId } from "./types";

export const PERSON_COOKIE = "persoon";
export const STORE_COOKIE = "winkel";
export const PEOPLE: Record<PersonId, { name: string; initial: string }> = {
  vincent: { name: "Vincent", initial: "V" },
  marleen: { name: "Marleen", initial: "M" },
};

export function isPersonId(v: unknown): v is PersonId {
  return v === "vincent" || v === "marleen";
}

/** Wie gebruikt deze telefoon? Stuurt naar /kies als dat nog niet bekend is. */
export async function requirePerson(): Promise<PersonId> {
  const v = (await cookies()).get(PERSON_COOKIE)?.value;
  if (!isPersonId(v)) redirect("/kies");
  return v;
}

export async function currentPerson(): Promise<PersonId | null> {
  const v = (await cookies()).get(PERSON_COOKIE)?.value;
  return isPersonId(v) ? v : null;
}

export async function chosenStoreId(): Promise<string | null> {
  return (await cookies()).get(STORE_COOKIE)?.value ?? null;
}

export const LONG_COOKIE = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 400 };
