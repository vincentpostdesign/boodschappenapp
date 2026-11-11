import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import sharp from "sharp";
import { z } from "zod";
import { db } from "./db";

// Claude leest foto's (product of bonnetje) en geeft gestructureerde JSON terug.
// De API-sleutel staat alleen op de server (.env.local / Vercel).

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY ontbreekt in .env.local");
  client ??= new Anthropic();
  return client;
}

export function visionAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Verkleint een foto (max. 1600 px, JPEG) en draait hem volgens de EXIF-oriëntatie. */
export async function prepareImage(input: ArrayBuffer): Promise<Buffer> {
  return sharp(Buffer.from(input)).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

/** Bewaart een foto in de privé-bucket 'fotos' en geeft het pad terug. */
export async function storePhoto(folder: "bonnen" | "watchlist", jpeg: Buffer): Promise<string> {
  const path = `${folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
  const { error } = await db().storage.from("fotos").upload(path, jpeg, { contentType: "image/jpeg" });
  if (error) throw new Error(`Foto opslaan mislukt: ${error.message}`);
  return path;
}

/** Tijdelijke link (1 uur) om een privéfoto te tonen. */
export async function photoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await db().storage.from("fotos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

async function readImage<S extends z.ZodType>(jpeg: Buffer, schema: S, instruction: string): Promise<z.infer<S>> {
  const res = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // Bij een (onterechte) weigering door de veiligheidsfilters draait de API het verzoek op een ander model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: zodOutputFormat(schema) },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } },
          { type: "text", text: instruction },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error("De foto kon niet worden gelezen (geweigerd).");
  if (res.stop_reason === "max_tokens") throw new Error("Het antwoord werd te lang; probeer een scherpere foto.");
  if (!res.parsed_output) throw new Error("Het antwoord kon niet worden gelezen.");
  return res.parsed_output as z.infer<S>;
}

// ---------- productfoto (watchlist) ----------

export const ProductPhotoSchema = z.object({
  herkend: z.boolean().describe("true als er duidelijk één supermarktproduct op de foto staat"),
  merk: z.string().nullable().describe("Merknaam zoals op de verpakking, bijv. 'Lenor'"),
  naam: z.string().nullable().describe("Korte Nederlandse productnaam zonder merk, bijv. 'Wasmiddelpods'"),
  variant: z.string().nullable().describe("Geur, smaak of variant, bijv. 'Zeebries'"),
  inhoud: z.string().nullable().describe("Inhoud of aantal, bijv. '30 stuks' of '750 ml'"),
  ean: z.string().nullable().describe("Streepjescode-cijfers (8 of 13), alleen als ze leesbaar zijn"),
  toelichting: z.string().describe("Eén korte zin: wat je ziet, of waarom het niet lukte"),
});
export type ProductPhoto = z.infer<typeof ProductPhotoSchema>;

export async function readProductPhoto(jpeg: Buffer): Promise<ProductPhoto> {
  return readImage(
    jpeg,
    ProductPhotoSchema,
    `Dit is een foto die iemand in een Nederlandse supermarkt maakte van een product dat ze in de aanbieding willen volgen.
Lees merk, productnaam, variant, inhoud en (als leesbaar) de EAN-code van de verpakking. Verzin niets: wat je niet kunt lezen is null.
Geef de productnaam als algemene Nederlandse soortnaam (bijv. 'Wasmiddelpods', 'Wc-papier', 'Vaatwastabletten'), zonder merk.`,
  );
}

export const BarcodePhotoSchema = z.object({
  ean: z.string().nullable().describe("De cijfers onder de streepjescode (8, 12 of 13 cijfers), zonder spaties; null als niet leesbaar"),
  toelichting: z.string().describe("Eén korte zin: wat je ziet, of waarom het niet lukte"),
});
export type BarcodePhoto = z.infer<typeof BarcodePhotoSchema>;

export async function readBarcodePhoto(jpeg: Buffer): Promise<BarcodePhoto> {
  return readImage(
    jpeg,
    BarcodePhotoSchema,
    `Dit is een foto van de streepjescode (EAN) op een supermarktproduct. Lees de cijfers die onder of naast de streepjes staan.
Neem alle cijfers over, ook het losse eerste cijfer links. Verzin niets: is een cijfer onleesbaar, geef dan null.`,
  );
}

/** Bestaande namen in alleen-hoofdletters omzetten naar gewone schrijfwijze (merknamen met hoofdletter). */
export async function tidyNames(names: string[]): Promise<string[]> {
  if (!names.length) return [];
  const Schema = z.object({ namen: z.array(z.string()).describe("Zelfde volgorde en aantal als de invoer") });
  const res = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low", format: zodOutputFormat(Schema) },
    messages: [
      {
        role: "user",
        content: `Dit zijn productnamen van een Nederlandse kassabon, in hoofdletters. Zet ze in gewone schrijfwijze: eerste letter hoofdletter, de rest klein, merk- en eigennamen met hoofdletter (AH, Coca Cola, Lenor). Verander verder niets: geen afkortingen uitschrijven, geen woorden toevoegen of weglaten. Eenheden zoals 2L en 500g blijven zo.\n\n${JSON.stringify(names)}`,
      },
    ],
  });
  const out = res.parsed_output?.namen;
  // Alleen gebruiken als het echt dezelfde namen zijn (hoofdletterongevoelig gelijk).
  if (!out || out.length !== names.length) return names;
  return names.map((n, i) => (out[i].toLowerCase().replace(/\s+/g, " ") === n.toLowerCase().replace(/\s+/g, " ") ? out[i] : n));
}

// ---------- bonnetje ----------

export const ReceiptSchema = z.object({
  winkel: z.enum(["aldi", "jumbo", "plus", "ah", "lidl", "onbekend"]).describe("Supermarkt van de bon (ah = Albert Heijn)"),
  datum: z.string().nullable().describe("Aankoopdatum als YYYY-MM-DD, null als niet leesbaar"),
  totaal: z.number().nullable().describe("Te betalen totaalbedrag in euro"),
  regels: z
    .array(
      z.object({
        naam: z.string().describe("Productnaam zoals op de bon, in gewone schrijfwijze (geen alleen-hoofdletters), bijv. 'Halfv melk 2L', 'Coca-Cola zero'"),
        aantal: z.number().describe("Aantal stuks (of kilo bij gewogen producten); 1 als niet vermeld"),
        prijs: z.number().describe("Regelbedrag in euro na korting op die regel; negatief voor statiegeld-retour of korting"),
      }),
    )
    .describe("Alle productregels, in volgorde. Geen subtotaal-, btw-, betaal- of wisselgeldregels."),
  opmerking: z.string().nullable().describe("Korte opmerking als iets onzeker of onleesbaar was"),
});
export type ReceiptRead = z.infer<typeof ReceiptSchema>;

export async function readReceiptPhoto(jpeg: Buffer): Promise<ReceiptRead> {
  return readImage(
    jpeg,
    ReceiptSchema,
    `Dit is een foto van een kassabon van een Nederlandse supermarkt. Lees de winkel, de datum, het totaalbedrag en alle productregels.
- Neem productnamen woord voor woord over zoals ze op de bon staan (afkortingen niet uitschrijven), maar schrijf ze in gewone schrijfwijze:
  eerste letter hoofdletter, de rest klein; merk- en eigennamen met hoofdletter (bijv. 'HALFV MELK 2L' → 'Halfv melk 2L', 'AH PINDAKAAS' → 'AH pindakaas', 'COCA COLA ZERO' → 'Coca Cola zero').
- Staat er een aantal (bijv. '2 x 1,29'), zet dan aantal 2 en prijs 2,58 (het regelbedrag).
- Een kortingsregel direct onder een product: verwerk die als aparte regel met negatief bedrag.
- Sla subtotaal, btw, pinbetaling, wisselgeld en spaaracties over.
- Verzin niets. Als een regel onleesbaar is, laat hem weg en meld dat in 'opmerking'.`,
  );
}
