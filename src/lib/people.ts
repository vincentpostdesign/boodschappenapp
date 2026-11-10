import "server-only";
import { unstable_cache } from "next/cache";
import sharp from "sharp";
import { db, check } from "./db";
import type { PersonId } from "./types";

export const TAG_MENSEN = "mensen";

export type PersonRow = { id: PersonId; name: string; initial: string; avatar_path: string | null };

export const getPeople = unstable_cache(
  async () => check(await db().from("people").select("id, name, initial, avatar_path").order("id", { ascending: false }), "personen") as PersonRow[],
  ["people-v1"],
  { tags: [TAG_MENSEN], revalidate: 3600 },
);

/**
 * Profielfoto's als kleine, ingebedde afbeelding (data-URL, 192 px, enkele kB) die met de pagina meekomt.
 * Geen los bestand meer: dat kwam in de iPhone-webapp soms half binnen en bleef dan in de cache hangen.
 */
const cachedAvatars = unstable_cache(
  async (): Promise<Record<PersonId, string | null>> => {
    const people = check(await db().from("people").select("id, avatar_path"), "personen") as { id: PersonId; avatar_path: string | null }[];
    const out: Record<PersonId, string | null> = { vincent: null, marleen: null };
    await Promise.all(
      people.map(async (p) => {
        if (!p.avatar_path) return;
        const { data } = await db().storage.from("fotos").download(p.avatar_path);
        if (!data) return;
        try {
          const small = await sharp(Buffer.from(await data.arrayBuffer())).resize(192, 192, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
          out[p.id] = `data:image/jpeg;base64,${small.toString("base64")}`;
        } catch {
          /* geen geldige foto: initiaal tonen */
        }
      }),
    );
    return out;
  },
  ["avatars-inline-v1"],
  { tags: [TAG_MENSEN], revalidate: 86400 },
);

export async function getAvatarUrls(): Promise<Record<PersonId, string | null>> {
  return cachedAvatars();
}
