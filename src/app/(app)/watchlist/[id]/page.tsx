import { notFound } from "next/navigation";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { photoUrl, visionAvailable } from "@/lib/vision";
import { WatchForm, type WatchItem } from "@/components/watchlist/WatchForm";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Watchlist-product · Boodschappen" };

export default async function WatchItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ foto?: string }>;
}) {
  await requirePerson();
  const { id } = await params;
  const { foto } = await searchParams;
  const isNew = id === "nieuw";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const item = isNew
    ? null
    : (check(await db().from("watchlist_items").select("*").eq("id", id).maybeSingle(), "watchlist") as WatchItem | null);
  if (!isNew && !item) notFound();

  return (
    <div className="space-y-4">
      <BackLink href="/watchlist" label="Watchlist" />
      <h1 className="text-2xl font-semibold tracking-tight">{item ? [item.brand, item.name].filter(Boolean).join(" ") : "Product volgen"}</h1>
      <WatchForm item={item} photo={await photoUrl(item?.photo_path ?? null)} startWithCamera={isNew && foto === "1"} canRecognize={visionAvailable()} />
    </div>
  );
}
