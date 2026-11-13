import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { unstable_cache, revalidateTag } from "next/cache";
import { db, check } from "./db";
import { CATEGORIES, CATEGORY_IDS, guessCategory, isCategory, type CategoryId } from "./categories";
import { normalize } from "./route";
import { bumpVersion } from "./version";

export const TAG_SOORTEN = "soorten";
const NO_TABLE = "__geen_tabel__";
/** Staat de tabel category_memory (migratie categorie_los) al in de database? */
export const memoryReady = (memory: Record<string, string>) => !(NO_TABLE in memory);

/** Onthouden indelingen (naam → soort), van Claude of met de hand gekozen. */
export const getCategoryMemory = unstable_cache(
  async () => {
    // Bestaat de tabel (nog) niet, dan werkt de indeling gewoon met de woordenlijst.
    const { data, error } = await db().from("category_memory").select("name, category");
    if (error) return { [NO_TABLE]: "1" } as Record<string, string>;
    return Object.fromEntries((data as { name: string; category: string }[]).map((r) => [r.name, r.category])) as Record<string, string>;
  },
  ["category-memory-v1"],
  { tags: [TAG_SOORTEN], revalidate: 3600 },
);

/** Soort voor een regel: met de hand/Claude gekozen, anders onthouden, anders de woordenlijst. */
export function categoryOf(item: { name: string; category?: string | null }, memory: Record<string, string>): string | null {
  if (item.category && isCategory(item.category)) return item.category;
  return memory[normalize(item.name)] ?? guessCategory(item.name);
}

export async function remember(name: string, category: CategoryId, source: "claude" | "hand") {
  const key = normalize(name).slice(0, 120);
  if (!key) return;
  // Een keuze met de hand wordt niet overschreven door Claude.
  if (source === "claude") {
    const existing = check(await db().from("category_memory").select("source").eq("name", key).maybeSingle(), "soort") as { source: string } | null;
    if (existing?.source === "hand") return;
  }
  check(await db().from("category_memory").upsert({ name: key, category, source, updated_at: new Date().toISOString() }), "soort onthouden");
  revalidateTag(TAG_SOORTEN);
}

/**
 * Losse regels die de woordenlijst en het geheugen niet kennen: in één keer door Claude laten indelen.
 * Draait op de achtergrond (after()); daarna verversen open schermen vanzelf.
 */
export async function categorizeUnknown(): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY) return 0;
  const items = check(
    await db().from("list_items").select("id, name, product_id, category").eq("archived", false).is("category", null),
    "lijst",
  ) as { id: string; name: string; product_id: string | null; category: string | null }[];
  const memory = await getCategoryMemory();
  const unknown = items.filter((i) => !i.product_id && !categoryOf(i, memory));
  const names = [...new Set(unknown.map((i) => i.name))].slice(0, 40);
  if (!names.length) return 0;

  const Schema = z.object({
    indeling: z.array(z.object({ naam: z.string(), soort: z.enum(CATEGORY_IDS) })).describe("Eén regel per product, zelfde volgorde"),
  });
  const res = await new Anthropic().beta.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(Schema) },
    messages: [
      {
        role: "user",
        content: `Deel deze boodschappen van een Nederlands huishouden in naar de afdeling van de supermarkt waar je ze vindt.
Soorten: ${CATEGORIES.map((c) => `${c.id} (${c.name})`).join(", ")}.
Gebruik "overig" alleen als het echt nergens past.

${names.map((n) => `- ${n}`).join("\n")}`,
      },
    ],
  });
  const out = res.parsed_output?.indeling ?? [];
  const byName = new Map(out.map((o) => [normalize(o.naam), o.soort]));
  let n = 0;
  for (const name of names) {
    const cat = byName.get(normalize(name));
    if (!cat) continue;
    await remember(name, cat, "claude");
    n++;
  }
  if (n) await bumpVersion();
  return n;
}
