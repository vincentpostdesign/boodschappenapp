import { NextResponse, type NextRequest } from "next/server";

// Zonder gekozen persoon eerst naar /kies (behalve API, cron en statische bestanden).
export function middleware(req: NextRequest) {
  const person = req.cookies.get("persoon")?.value;
  if (person === "vincent" || person === "marleen") return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/kies";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!kies|api|_next|sw\\.js|manifest\\.webmanifest|icon|apple-touch-icon|favicon).*)"],
};
