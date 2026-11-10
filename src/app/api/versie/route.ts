import { NextResponse } from "next/server";
import { getVersion } from "@/lib/version";

export const dynamic = "force-dynamic";

/** Klein verzoek voor de open apps: is er iets veranderd? (Alleen met toegang; de middleware controleert dat.) */
export async function GET() {
  return NextResponse.json({ v: await getVersion() }, { headers: { "Cache-Control": "no-store" } });
}
