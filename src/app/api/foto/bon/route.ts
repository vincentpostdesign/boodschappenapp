import { NextResponse, type NextRequest } from "next/server";
import { db, check } from "@/lib/db";
import { currentPerson } from "@/lib/session";
import { prepareImage, readReceiptPhoto, storePhoto, visionAvailable } from "@/lib/vision";
import { applyAliases, cleanLines } from "@/lib/receipt";

export const maxDuration = 120;
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Bonnetje: de foto wordt meteen opgeslagen (ook als uitlezen mislukt),
 * daarna leest Claude de regels uit. Het resultaat is altijd een bon met status 'nieuw' om te controleren.
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
  const receipt = check(
    await db().from("receipts").insert({ photo_path: photoPath, uploaded_by: person, status: "nieuw" }).select("id").single(),
    "bon opslaan",
  ) as { id: string };

  if (!visionAvailable()) {
    return NextResponse.json({ id: receipt.id, warning: "Automatisch uitlezen staat uit (geen Claude-sleutel). Vul de regels zelf in." });
  }
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
    const lines = applyAliases(cleanLines(read.regels), aliases);
    check(
      await db().from("receipts").update({ store_id: storeId, purchased_on: date, total: read.totaal }).eq("id", receipt.id),
      "bon bijwerken",
    );
    if (lines.length) {
      check(
        await db().from("receipt_lines").insert(lines.map((l, i) => ({ ...l, receipt_id: receipt.id, line_no: i + 1 }))),
        "bonregels opslaan",
      );
    }
    return NextResponse.json({ id: receipt.id, lines: lines.length, note: read.opmerking });
  } catch (e) {
    return NextResponse.json({ id: receipt.id, warning: `Uitlezen lukte niet: ${(e as Error).message} De foto is bewaard; vul de regels zelf in.` });
  }
}
