import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/access";

// Volgorde: eerst de gezinscode (cookie 'toegang'), dan wie je bent (cookie 'persoon').
// De cron-routes hebben hun eigen geheim en vallen hierbuiten.
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/cron/")) return NextResponse.next();

  const hasAccess = await verifyAccessToken(req.cookies.get(ACCESS_COOKIE)?.value);
  if (!hasAccess) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
    if (path === "/kies") return NextResponse.next();
    return redirectToKies(req);
  }

  if (path === "/kies" || path.startsWith("/api/")) return NextResponse.next();
  const person = req.cookies.get("persoon")?.value;
  if (person === "vincent" || person === "marleen") return NextResponse.next();
  return redirectToKies(req);
}

function redirectToKies(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/kies";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|sw\\.js|manifest\\.webmanifest|icon|apple-touch-icon|favicon).*)"],
};
