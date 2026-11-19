"use server";

import { requirePerson } from "@/lib/session";
import { spokenToItems } from "@/lib/spoken-ai";
import type { Spoken } from "@/lib/spoken";
import { newKey, revokeKey } from "@/lib/voice-keys";

/** Ingesproken tekst in de app → losse boodschappen om te controleren. */
export async function parseSpoken(text: string): Promise<Spoken[]> {
  await requirePerson();
  return spokenToItems(text);
}

/** Sleutel voor inspreken via Siri / widget maken (de oude werkt dan niet meer). Wordt maar één keer getoond. */
export async function createVoiceKey(): Promise<string> {
  const me = await requirePerson();
  return newKey(me);
}

export async function revokeVoiceKey(): Promise<void> {
  const me = await requirePerson();
  await revokeKey(me);
}
