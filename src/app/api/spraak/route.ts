import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { personForKey } from "@/lib/voice-keys";
import { spokenToItems } from "@/lib/spoken-ai";
import { insertFreeItem } from "@/lib/list-add";
import { asLine } from "@/lib/spoken";
import { bumpVersion } from "@/lib/version";
import { categorizeUnknown } from "@/lib/categorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Inspreken via Siri / een widget (app Opdrachten): "Dicteer tekst" → POST hierheen met de eigen sleutel.
// Antwoord is gewone tekst, zodat Opdrachten het meteen als melding kan tonen.
const text = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  let said = "";
  let bodyKey: string | undefined;
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("json")) {
      const j = (await req.json()) as Record<string, unknown>;
      said = String(j.tekst ?? j.text ?? "");
      bodyKey = typeof j.sleutel === "string" ? j.sleutel : undefined;
    } else if (type.includes("form")) {
      const f = await req.formData();
      said = String(f.get("tekst") ?? f.get("text") ?? "");
      bodyKey = (f.get("sleutel") as string | null) ?? undefined;
    } else {
      said = await req.text();
    }
  } catch {
    return text("Ik kon niet lezen wat je zei.", 400);
  }
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const q = new URL(req.url).searchParams;
  return handle(auth || req.headers.get("x-sleutel") || bodyKey || q.get("sleutel"), said || q.get("tekst") || "");
}

/** Eenvoudigste opdracht: alleen een link, https://…/api/spraak?sleutel=…&tekst=<Gedicteerde tekst> */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  return handle(q.get("sleutel"), q.get("tekst") ?? q.get("text") ?? "");
}

async function handle(key: string | null | undefined, said: string) {
  const person = await personForKey(key);
  if (!person) return text("Onbekende sleutel. Maak een nieuwe in de app onder Beheer → Inspreken met Siri.", 401);

  said = said.trim().slice(0, 1000);
  if (!said) return text("Ik heb niets gehoord.");

  const items = (await spokenToItems(said)).slice(0, 30);
  const added: string[] = [];
  for (const it of items) {
    const name = await insertFreeItem(person, asLine(it)).catch(() => null);
    if (name) added.push(it.quantity > 1 ? `${it.quantity}× ${name}` : name);
  }
  revalidatePath("/", "layout");
  after(async () => {
    await bumpVersion(); // open apps (ook die van de ander) verversen zichzelf
    await categorizeUnknown().catch(() => 0);
  });
  if (!added.length) return text(`Geen boodschappen gevonden in: "${said}"`);
  return text(`${added.length === 1 ? "Op de lijst" : `${added.length} op de lijst`}: ${added.join(", ")}`);
}
