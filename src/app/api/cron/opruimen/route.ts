import { NextResponse, type NextRequest } from "next/server";
import { db, check } from "@/lib/db";
import { cronGuard } from "@/lib/cron";
import { itemsToArchive } from "@/lib/cleanup";

/** 's Nachts: afgevinkte regels van de lijst halen (archiveren, niet wissen). */
export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const items = check(
    await db().from("list_items").select("id, checked, checked_at, archived").eq("archived", false).eq("checked", true),
    "lijst",
  ) as { id: string; checked: boolean; checked_at: string | null; archived: boolean }[];
  const ids = itemsToArchive(items);
  for (let i = 0; i < ids.length; i += 300) {
    check(
      await db().from("list_items").update({ archived: true, archived_at: new Date().toISOString() }).in("id", ids.slice(i, i + 300)),
      "archiveren",
    );
  }
  return NextResponse.json({ archived: ids.length });
}
