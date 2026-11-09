import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

/** Vercel Cron stuurt 'Authorization: Bearer <CRON_SECRET>'. Lokaal kun je dezelfde header meesturen. */
export function cronGuard(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET ontbreekt" }, { status: 500 });
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    return NextResponse.json({ error: "Niet toegestaan" }, { status: 401 });
  }
  return null;
}
