import { NextResponse, type NextRequest } from "next/server";
import { currentPerson } from "@/lib/session";
import { prepareImage, readBarcodePhoto, readProductPhoto, storePhoto, visionAvailable } from "@/lib/vision";
import { validEan } from "@/lib/ean";

export const maxDuration = 60;
const MAX_BYTES = 15 * 1024 * 1024;

/** Productfoto (voorkant) of foto van de streepjescode: opslaan en (als de Claude-sleutel er is) uitlezen. */
export async function POST(req: NextRequest) {
  if (!(await currentPerson())) return NextResponse.json({ error: "Kies eerst wie je bent" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("foto");
  const barcode = form.get("soort") === "streepjescode";
  if (!(file instanceof File) || !file.type.startsWith("image/")) return NextResponse.json({ error: "Geen foto ontvangen" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Foto is te groot (max. 15 MB)" }, { status: 413 });

  let jpeg: Buffer;
  try {
    jpeg = await prepareImage(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Dit fotoformaat wordt niet herkend. Probeer een gewone foto (JPEG)." }, { status: 415 });
  }
  const photoPath = await storePhoto("watchlist", jpeg);
  if (!visionAvailable()) {
    return NextResponse.json({ photoPath, read: null, warning: "Automatisch herkennen staat uit (geen Claude-sleutel). Vul de gegevens zelf in." });
  }
  try {
    if (barcode) {
      const r = await readBarcodePhoto(jpeg);
      const ean = r.ean?.replace(/\D/g, "") ?? null;
      if (!ean) return NextResponse.json({ photoPath, ean: null, warning: `Streepjescode niet leesbaar: ${r.toelichting} Probeer dichterbij en recht van voren.` });
      if (!validEan(ean)) return NextResponse.json({ photoPath, ean: null, warning: `Gelezen: ${ean}, maar het controlecijfer klopt niet. Maak een scherpere foto of typ de code over.` });
      return NextResponse.json({ photoPath, ean });
    }
    const read = await readProductPhoto(jpeg);
    return NextResponse.json({ photoPath, read });
  } catch (e) {
    return NextResponse.json({ photoPath, read: null, warning: `Herkennen lukte niet: ${(e as Error).message} Vul de gegevens zelf in.` });
  }
}
