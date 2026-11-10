import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { BackLink } from "@/components/BackLink";
import { GiftList } from "@/components/beheer/GiftList";
import { OCCASIONS, type Gift, type OccasionId } from "@/lib/gifts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cadeaulijst · Boodschappen" };

type Row = {
  id: string;
  name: string;
  recipient: string | null;
  occasion: OccasionId;
  price: string | number | null;
  link: string | null;
  note: string | null;
  bought: boolean;
  secret: boolean;
  added_by: "vincent" | "marleen";
};

/** Welke gelegenheid komt eraan? Sint tot 5 dec, dan kerst tot 26 dec, daarna verjaardag. */
function upcoming(): OccasionId {
  const nl = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const m = nl.getMonth() + 1;
  const d = nl.getDate();
  if (m === 12 && d > 5 && d <= 26) return "kerst";
  if (m >= 9 && (m < 12 || d <= 5)) return "sint";
  return "verjaardag";
}

export default async function CadeausPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const me = await requirePerson();
  const { g } = await searchParams;
  const rows = check(
    await db()
      .from("gifts")
      .select("id, name, recipient, occasion, price, link, note, bought, secret, added_by")
      // Geheime cadeaus van de ander niet ophalen.
      .or(`secret.eq.false,added_by.eq.${me}`)
      .order("created_at"),
    "cadeaus",
  ) as Row[];
  const gifts: Gift[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    recipient: r.recipient,
    occasion: r.occasion,
    price: r.price == null ? null : Number(r.price),
    link: r.link,
    note: r.note,
    bought: r.bought,
    secret: r.secret,
    addedBy: r.added_by,
  }));
  const initial = OCCASIONS.some((o) => o.id === g) ? (g as OccasionId) : upcoming();

  return (
    <div className="space-y-4">
      <BackLink href="/beheer" label="Beheer" />
      <h1 className="text-2xl font-semibold tracking-tight">Cadeaulijst</h1>
      <GiftList gifts={gifts} me={me} initial={initial} />
    </div>
  );
}
