import Link from "next/link";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { getSetting, getStores } from "@/lib/data";
import { todayNL } from "@/lib/dates";
import { photoUrl } from "@/lib/vision";
import { WatchOffers } from "@/components/watchlist/WatchOffers";
import { NotifyMode } from "@/components/watchlist/NotifyMode";
import { IconCamera, IconPlus } from "@/components/icons";
import { ScoupyDeals, type ScoupyView } from "@/components/watchlist/ScoupyDeals";
import { getScoupy } from "@/lib/scoupy-store";
import { dealMatches, storeList, type ScoupyDeal } from "@/lib/scoupy";
import { shortDate } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Watchlist · Boodschappen" };

type Item = {
  id: string;
  name: string;
  brand: string | null;
  content: string | null;
  photo_path: string | null;
  image_url: string | null;
  max_price: number | null;
  min_discount_pct: number | null;
};
type Hit = {
  id: string;
  watchlist_item_id: string;
  offer: {
    name: string;
    store_id: string;
    price: number | null;
    original_price: number | null;
    promo_label: string | null;
    valid_from: string | null;
    valid_until: string | null;
    status: string;
    quantity: string | null;
  } | null;
};

export default async function WatchlistPage({ searchParams }: { searchParams: Promise<{ hit?: string; toevoegen?: string }> }) {
  await requirePerson();
  const sp = await searchParams;
  const today = todayNL();
  const [itemsRes, hitsRes, stores, mode, refreshedAt, scoupy, listRes] = await Promise.all([
    db().from("watchlist_items").select("id, name, brand, content, photo_path, image_url, max_price, min_discount_pct").order("name"),
    db()
      .from("watchlist_hits")
      .select("id, watchlist_item_id, offer:offers_cache!inner(name, store_id, price, original_price, promo_label, valid_from, valid_until, status, quantity)")
      .gte("offer.valid_until", today),
    getStores(),
    getSetting<string>("watchlist_notify", "direct"),
    getSetting<string | null>("offers_refreshed_at", null),
    getScoupy().catch(() => ({ at: null, deals: [] as ScoupyDeal[] })),
    db().from("list_items").select("name").eq("archived", false).eq("checked", false),
  ]);
  const listNames = ((listRes.data ?? []) as { name: string }[]).map((l) => l.name);
  const scoupyView: ScoupyView[] = scoupy.deals.map((d) => ({
    id: d.id,
    title: d.title,
    product: d.product,
    brand: d.brand,
    short: d.short,
    stores: storeList(d),
    until: shortDate(d.ends),
    image: d.image,
    onList: listNames.some((n) => dealMatches(n, d)),
  }));
  const scoupyUpdated = scoupy.at
    ? new Intl.DateTimeFormat("nl-NL", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }).format(new Date(scoupy.at))
    : null;
  const items = check(itemsRes, "watchlist") as Item[];
  const hits = (check(hitsRes, "treffers") as unknown as Hit[]).filter((h) => h.offer);
  const storeNames = Object.fromEntries(stores.map((s) => [s.id, s.name]));
  const thumbs = Object.fromEntries(await Promise.all(items.map(async (i) => [i.id, i.image_url ?? (await photoUrl(i.photo_path))] as const)));

  const view = items.map((i) => ({
    id: i.id,
    title: [i.brand, i.name].filter(Boolean).join(" "),
    sub: [
      i.content,
      i.max_price != null ? `max. €${Number(i.max_price).toFixed(2).replace(".", ",")}` : null,
      i.min_discount_pct != null ? `min. ${i.min_discount_pct}% korting` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    thumb: thumbs[i.id],
    offers: hits
      .filter((h) => h.watchlist_item_id === i.id)
      .map((h) => ({
        hitId: h.id,
        name: h.offer!.name,
        store: storeNames[h.offer!.store_id] ?? h.offer!.store_id,
        price: h.offer!.price != null ? Number(h.offer!.price) : null,
        originalPrice: h.offer!.original_price != null ? Number(h.offer!.original_price) : null,
        label: h.offer!.promo_label,
        quantity: h.offer!.quantity,
        from: h.offer!.valid_from,
        until: h.offer!.valid_until,
        upcoming: h.offer!.status === "upcoming",
      }))
      .sort((a, b) => Number(a.upcoming) - Number(b.upcoming) || (a.price ?? 1e9) - (b.price ?? 1e9)),
  }));

  const refreshed = refreshedAt
    ? new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }).format(new Date(refreshedAt))
    : null;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
        <p className="text-sm text-muted">
          Producten die je niet elke week koopt, maar wel in de aanbieding wilt hebben.
          {refreshed ? ` Aanbiedingen bijgewerkt: ${refreshed}.` : " Nog geen aanbiedingen opgehaald."}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/watchlist/nieuw?foto=1"
          className="flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-accent px-3 text-[15px] font-semibold text-accent-ink"
        >
          <IconCamera className="h-5 w-5" /> Met foto
        </Link>
        <Link
          href="/watchlist/nieuw"
          className="flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-line bg-surface px-3 text-[15px] font-semibold"
        >
          <IconPlus className="h-5 w-5" /> Zelf invullen
        </Link>
      </div>

      <WatchOffers items={view} focusHit={sp.hit ?? null} autoAdd={sp.toevoegen === "1"} />

      <ScoupyDeals deals={scoupyView} updated={scoupyUpdated} />

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted">Meldingen bij een goede aanbieding</h2>
        <NotifyMode mode={mode === "wekelijks" ? "wekelijks" : "direct"} />
      </section>

      <p className="px-1 text-xs text-muted">
        Aanbiedingen komen van PrijsProfeet (folderacties van o.a. Jumbo, Albert Heijn en Plus). De Aldi en de Lidl staan daar nauwelijks in.
      </p>
    </div>
  );
}
