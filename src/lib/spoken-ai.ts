import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getProducts } from "@/lib/data";
import { splitSpoken, type Spoken } from "@/lib/spoken";

/**
 * Ingesproken tekst ("melk kaas twee pakken yoghurt en de zakken voor de afvalbak") → losse boodschappen.
 * Claude splitst en herkent jullie vaste producten; zonder Claude (of bij een fout) splitsen we zelf.
 */
export async function spokenToItems(text: string): Promise<Spoken[]> {
  const t = text.trim().slice(0, 1000);
  if (!t) return [];
  const fallback = splitSpoken(t);
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const products = (await getProducts()).map((p) => p.name).slice(0, 200);
    const Schema = z.object({
      boodschappen: z.array(z.object({ naam: z.string(), aantal: z.number().int() })).describe("Eén regel per product, in de volgorde waarin ze genoemd zijn"),
    });
    const res = await new Anthropic().beta.messages.parse({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: 1500,
      output_config: { effort: "low", format: zodOutputFormat(Schema) },
      messages: [
        {
          role: "user",
          content: `Iemand heeft boodschappen ingesproken (spraakherkenning, dus zonder leestekens en soms met fouten).
Maak er een boodschappenlijst van: één regel per product, met het aantal (standaard 1).
- Laat opvulwoorden weg ("we hebben nog … nodig", "zet op de lijst").
- Verpakking hoort niet bij de naam: "twee pakken melk" wordt Melk, aantal 2. Gewicht wel: "500 gram gehakt".
- Schrijf de naam met een hoofdletter en verder gewoon (geen hoofdletters overal).
- Lijkt iets op een van onze vaste producten, gebruik dan precies die naam.

Vaste producten: ${products.join("; ") || "(nog geen)"}

Ingesproken: "${t}"`,
        },
      ],
    });
    const out = (res.parsed_output?.boodschappen ?? [])
      .map((b) => ({ name: b.naam.trim().slice(0, 120), quantity: Math.max(1, Math.min(99, Math.round(b.aantal) || 1)) }))
      .filter((b) => b.name.length > 1);
    return out.length ? out : fallback;
  } catch {
    return fallback;
  }
}
