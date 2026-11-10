import "server-only";
import { unstable_cache } from "next/cache";
import { db, check } from "./db";
import type { PersonId } from "./types";

export const TAG_MENSEN = "mensen";

export type PersonRow = { id: PersonId; name: string; initial: string; avatar_path: string | null };

export const getPeople = unstable_cache(
  async () => check(await db().from("people").select("id, name, initial, avatar_path").order("id", { ascending: false }), "personen") as PersonRow[],
  ["people-v1"],
  { tags: [TAG_MENSEN], revalidate: 3600 },
);

/** Per persoon de URL van de profielfoto (met versie, zodat een nieuwe foto direct zichtbaar is), of null. */
export async function getAvatarUrls(): Promise<Record<PersonId, string | null>> {
  const people = await getPeople();
  const url = (id: PersonId) => {
    const p = people.find((x) => x.id === id);
    if (!p?.avatar_path) return null;
    const v = p.avatar_path.split("-").pop()?.replace(".jpg", "").slice(0, 8);
    return `/api/foto/persoon/${id}?v=${v}`;
  };
  return { vincent: url("vincent"), marleen: url("marleen") };
}
