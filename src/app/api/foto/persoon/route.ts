import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import sharp from "sharp";
import { db, check } from "@/lib/db";
import { currentPerson } from "@/lib/session";
import { TAG_MENSEN } from "@/lib/people";

const MAX_BYTES = 5 * 1024 * 1024;

async function oldPath(person: string): Promise<string | null> {
  const row = check(await db().from("people").select("avatar_path").eq("id", person).single(), "persoon") as { avatar_path: string | null };
  return row.avatar_path;
}

/** Eigen profielfoto opslaan (de uitsnede komt al vierkant uit de app; hier nog eens netjes 512×512 JPEG zonder metadata). */
export async function POST(req: NextRequest) {
  const person = await currentPerson();
  if (!person) return NextResponse.json({ error: "Kies eerst wie je bent" }, { status: 401 });
  const file = (await req.formData()).get("foto");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return NextResponse.json({ error: "Geen foto ontvangen" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Foto is te groot" }, { status: 413 });
  let jpeg: Buffer;
  try {
    jpeg = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize(512, 512, { fit: "cover" }).jpeg({ quality: 86 }).toBuffer();
  } catch {
    return NextResponse.json({ error: "Dit is geen geldige foto (JPEG, PNG of WebP)." }, { status: 415 });
  }
  const path = `personen/${person}-${crypto.randomUUID()}.jpg`;
  const up = await db().storage.from("fotos").upload(path, jpeg, { contentType: "image/jpeg" });
  if (up.error) return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  const old = await oldPath(person);
  check(await db().from("people").update({ avatar_path: path }).eq("id", person), "persoon bijwerken");
  if (old) await db().storage.from("fotos").remove([old]);
  revalidateTag(TAG_MENSEN);
  return NextResponse.json({ ok: true });
}

/** Eigen profielfoto verwijderen. */
export async function DELETE() {
  const person = await currentPerson();
  if (!person) return NextResponse.json({ error: "Kies eerst wie je bent" }, { status: 401 });
  const old = await oldPath(person);
  check(await db().from("people").update({ avatar_path: null }).eq("id", person), "persoon bijwerken");
  if (old) await db().storage.from("fotos").remove([old]);
  revalidateTag(TAG_MENSEN);
  return NextResponse.json({ ok: true });
}
