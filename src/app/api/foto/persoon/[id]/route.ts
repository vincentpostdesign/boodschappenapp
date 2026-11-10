import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isPersonId } from "@/lib/session";
import { getPeople } from "@/lib/people";

/**
 * Profielfoto tonen (alleen met toegang; de middleware controleert dat).
 * De URL bevat ?v=<versie>, dus de browser mag hem lang bewaren.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isPersonId(id)) return new NextResponse(null, { status: 404 });
  const person = (await getPeople()).find((p) => p.id === id);
  if (!person?.avatar_path) return new NextResponse(null, { status: 404 });
  const { data, error } = await db().storage.from("fotos").download(person.avatar_path);
  if (error || !data) return new NextResponse(null, { status: 404 });
  return new NextResponse(data, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=2592000, immutable" },
  });
}
