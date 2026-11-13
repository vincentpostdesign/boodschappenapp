import { NextResponse, after, type NextRequest } from "next/server";
import { db, check } from "@/lib/db";
import { currentPerson } from "@/lib/session";
import { prepareImage, readReceiptPhoto, storePhoto, visionAvailable } from "@/lib/vision";
import { applyAliases, cleanLines } from "@/lib/receipt";
import { bumpVersion } from "@/lib/version";
import { sendToPerson } from "@/lib/push";
import type { PersonId } from "@/lib/types";

export const maxDuration = 120;
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Bonnetje: de foto wordt meteen opgeslagen en de app krijgt direct antwoord.
 * Claude leest de bon daarna op de achtergrond uit (after()), zodat je intussen gewoon verder kunt in de app.
 * Klaar → regels opgeslagen, open schermen verversen vanzelf en je krijgt een melding.
 */
export async function POST(req: NextRequest) {
  const person = await currentPerson();
  if (!person) return NextResponse.json({ error: "Kies eerst wie je bent" }, { status: 401 });
  const file = (await req.formData()).get("foto");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return NextResponse.json({ error: "Geen foto ontvangen" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Foto is te groot (max. 15 MB)" }, { status: 413 });

  let jpeg: Buffer;
  try {
    jpeg = await prepareImage(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Dit fotoformaat wordt niet herkend. Probeer een gewone foto (JPEG)." }, { status: 415 });
  }
  const photoPath = await storePhoto("bonnen", jpeg);
  const canRead = visionAvailable();
  const receipt = check(
    await db()
      .from("receipts")
      .insert({
        photo_path: photoPath,
        uploaded_by: person,
        status: "nieuw",
        reading: canRead,
        read_note: canRead ? null : "Automatisch uitlezen staat uit (geen Claude-sleutel). Vul de regels zelf in.",
      })
      .select("id")
      .single(),
    "bon opslaan",
  ) as { id: string };

  if (canRead) after(() => readInBackground(receipt.id, jpeg, person));
  after(bumpVersion);
  return NextResponse.json({ id: receipt.id, reading: canRead });
}

async function readInBackground(id: string, jpeg: Buffer, person: PersonId) {
  let note: string | null = null;
  let lines = 0;
  try {
    const read = await readReceiptPhoto(jpeg);
    const storeId = read.winkel === "onbekend" ? null : read.winkel;
    const date = read.datum && /^\d{4}-\d{2}-\d{2}$/.test(read.datum) ? read.datum : null;
    const aliases = storeId
      ? (check(await db().from("product_aliases").select("alias, product_id").eq("store_id", storeId), "aliassen") as {
          alias: string;
          product_id: string;
        }[])
      : [];
    const clean = applyAliases(cleanLines(read.regels), aliases);
    // De bon kan intussen verwijderd zijn: dan niets meer doen.
    const exists = check(await db().from("receipts").select("id").eq("id", id).maybeSingle(), "bon");
    if (!exists) return;
    if (clean.length) {
      check(await db().from("receipt_lines").insert(clean.map((l, i) => ({ ...l, receipt_id: id, line_no: i + 1 }))), "bonregels opslaan");
    }
    lines = clean.length;
    note = read.opmerking;
    check(
      await db().from("receipts").update({ store_id: storeId, purchased_on: date, total: read.totaal, reading: false, read_note: note }).eq("id", id),
      "bon bijwerken",
    );
  } catch (e) {
    note = `Uitlezen lukte niet: ${(e as Error).message} De foto is bewaard; vul de regels zelf in.`.slice(0, 400);
    await db().from("receipts").update({ reading: false, read_note: note }).eq("id", id);
  }
  await bumpVersion();
  await sendToPerson(person, {
    title: lines ? "Bon uitgelezen" : "Bon kon niet worden uitgelezen",
    body: lines ? `${lines} regels gevonden. Tik om te controleren.` : (note ?? "Vul de regels zelf in."),
    url: `/bonnen/${id}`,
    tag: `bon-${id}`,
  }).catch(() => 0);
}
