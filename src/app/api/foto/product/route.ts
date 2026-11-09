import { NextResponse, type NextRequest } from "next/server";
import { currentPerson } from "@/lib/session";
import { prepareImage, readProductPhoto, storePhoto, visionAvailable } from "@/lib/vision";

export const maxDuration = 60;
const MAX_BYTES = 15 * 1024 * 1024;

/** Productfoto: opslaan en (als de Claude-sleutel er is) uitlezen. */
export async function POST(req: NextRequest) {
  if (!(await currentPerson())) return NextResponse.json({ error: "Kies eerst wie je bent" }, { status: 401 });
  const file = (await req.formData()).get("foto");
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
    const read = await readProductPhoto(jpeg);
    return NextResponse.json({ photoPath, read });
  } catch (e) {
    return NextResponse.json({ photoPath, read: null, warning: `Herkennen lukte niet: ${(e as Error).message} Vul de gegevens zelf in.` });
  }
}
