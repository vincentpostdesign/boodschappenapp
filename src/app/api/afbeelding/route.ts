import { NextResponse, type NextRequest } from "next/server";
import { currentPerson } from "@/lib/session";
import { findProductImages } from "@/lib/product-image";

export const maxDuration = 30;

/** Officiële productafbeelding zoeken: ?ean=…&q=merk+naam */
export async function GET(req: NextRequest) {
  if (!(await currentPerson())) return NextResponse.json({ error: "Kies eerst wie je bent" }, { status: 401 });
  const ean = req.nextUrl.searchParams.get("ean")?.replace(/\D/g, "") || null;
  const q = req.nextUrl.searchParams.get("q");
  if (!ean && !q?.trim()) return NextResponse.json({ error: "Vul eerst een merk/product in of maak een foto van de streepjescode" }, { status: 400 });
  const results = await findProductImages({ ean, query: q, brand: req.nextUrl.searchParams.get("merk") });
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
