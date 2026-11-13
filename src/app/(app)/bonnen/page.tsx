import Link from "next/link";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { getStores } from "@/lib/data";
import { euro } from "@/lib/dates";
import { ReceiptUpload } from "@/components/bonnen/ReceiptUpload";
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
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/bonnen/${r.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {r.store_id ? names[r.store_id] : "Winkel onbekend"} · {r.purchased_on ? fmt(r.purchased_on) : "datum onbekend"}
                  </span>
                  <span className="block text-sm text-muted">
                    {stillReading(r) ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-accent">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/25 border-t-accent" aria-hidden />
                        Wordt uitgelezen…
                      </span>
                    ) : (
                      `${r.lines[0]?.count ?? 0} regels`
                    )}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{r.total != null ? euro(Number(r.total)) : "—"}</span>
                  {r.status === "nieuw" && !stillReading(r) && <span className="block text-xs font-semibold text-deal">Controleren</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
