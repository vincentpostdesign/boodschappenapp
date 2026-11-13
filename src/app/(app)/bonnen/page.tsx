import Link from "next/link";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { getStores } from "@/lib/data";
import { euro } from "@/lib/dates";
import { ReceiptUpload } from "@/components/bonnen/ReceiptUpload";
import { ReceiptList } from "@/components/bonnen/ReceiptList";
import { IconChart } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bonnetjes · Boodschappen" };

type Row = {
  id: string;
  store_id: string | null;
  purchased_on: string | null;
  total: number | null;
  status: string;
  created_at: string;
  reading: boolean;
  lines: { count: number }[];
};

/** Nog bezig met uitlezen? (Na 3 minuten is er iets misgegaan; dan gewoon tonen als te controleren.) */
const stillReading = (r: { reading: boolean; created_at: string }) => r.reading && Date.now() - new Date(r.created_at).getTime() < 3 * 60_000;

export default async function BonnenPage() {
  await requirePerson();
  const [res, stores] = await Promise.all([
    db().from("receipts").select("id, store_id, purchased_on, total, status, created_at, reading, lines:receipt_lines(count)").order("created_at", { ascending: false }).limit(100),
    getStores(),
  ]);
  const rows = check(res, "bonnen") as unknown as Row[];
  const names = Object.fromEntries(stores.map((s) => [s.id, s.name]));
  const fmt = (d: string) => new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)).replace(/\./g, "");
  const open = rows.filter((r) => r.status === "nieuw" && !stillReading(r));
  // Zelfde winkel, datum en totaal: waarschijnlijk twee keer dezelfde bon gefotografeerd.
  const dupKey = new Map<string, number>();
  for (const r of rows) {
    if (!r.store_id || !r.purchased_on || r.total == null) continue;
    const k = `${r.store_id}|${r.purchased_on}|${Number(r.total)}`;
    dupKey.set(k, (dupKey.get(k) ?? 0) + 1);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Bonnetjes</h1>
        <Link href="/dashboard" className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-line bg-surface px-3 text-sm font-semibold">
          <IconChart className="h-5 w-5" /> Dashboard
        </Link>
      </header>

      <ReceiptUpload />

      {open.length > 0 && (
        <p className="rounded-xl bg-deal-soft px-4 py-3 text-sm font-medium text-deal">
          {open.length === 1 ? "1 bon wacht" : `${open.length} bonnen wachten`} op controle. Pas aan wat niet klopt en sla op.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-8 text-center text-muted">
          Nog geen bonnetjes. Met bonnen leert de app de echte productnamen en prijzen, vooral bij de Aldi.
        </p>
      ) : (
        <ReceiptList
          rows={rows.map((r) => ({
            id: r.id,
            title: `${r.store_id ? names[r.store_id] : "Winkel onbekend"} · ${r.purchased_on ? fmt(r.purchased_on) : "datum onbekend"}`,
            lines: r.lines[0]?.count ?? 0,
            total: r.total != null ? euro(Number(r.total)) : "—",
            check: r.status === "nieuw" && !stillReading(r),
            reading: stillReading(r),
            duplicate: !!r.store_id && !!r.purchased_on && r.total != null && (dupKey.get(`${r.store_id}|${r.purchased_on}|${Number(r.total)}`) ?? 0) > 1,
          }))}
        />
      )}
    </div>
  );
}
