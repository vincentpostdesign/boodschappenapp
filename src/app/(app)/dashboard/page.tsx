import Link from "next/link";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { getStores } from "@/lib/data";
import { addDays, euro, todayNL } from "@/lib/dates";
import { PERIOD_DAYS, bucketOf, buckets, frequencies, type Period, type Purchase } from "@/lib/dashboard";
import { BarList, Columns } from "@/components/dashboard/Charts";
import { MakeFixedButton } from "@/components/dashboard/MakeFixedButton";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard · Boodschappen" };

const PERIODS: { id: Period; label: string }[] = [
  { id: "4w", label: "4 weken" },
  { id: "3m", label: "3 maanden" },
  { id: "jaar", label: "Jaar" },
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  await requirePerson();
  const sp = await searchParams;
  const period: Period = sp.periode === "4w" || sp.periode === "jaar" ? sp.periode : "3m";
  const today = todayNL();
  const bks = buckets(period, today);
  const from = [bks[0].key, addDays(today, -PERIOD_DAYS[period])].sort()[0];

  const [receiptsRes, listRes, stores] = await Promise.all([
    db()
      .from("receipts")
      .select("id, store_id, purchased_on, total, lines:receipt_lines(raw_name, price, product_id)")
      .eq("status", "gecontroleerd")
      .gte("purchased_on", from)
      .lte("purchased_on", today),
    db().from("list_items").select("name, product_id, checked_at").eq("checked", true).gte("checked_at", `${from}T00:00:00Z`),
    getStores(),
  ]);
  const receipts = check(receiptsRes, "bonnen") as unknown as {
    store_id: string;
    purchased_on: string;
    total: number | null;
    lines: { raw_name: string; price: number; product_id: string | null }[];
  }[];
  const listItems = check(listRes, "lijsthistorie") as { name: string; product_id: string | null; checked_at: string }[];
  const names = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  const amount = (r: (typeof receipts)[number]) => (r.total != null ? Number(r.total) : r.lines.reduce((s, l) => s + Number(l.price), 0));
  const total = receipts.reduce((s, r) => s + amount(r), 0);

  // Per winkel
  const perStore = new Map<string, { value: number; count: number }>();
  for (const r of receipts) {
    const cur = perStore.get(r.store_id) ?? { value: 0, count: 0 };
    perStore.set(r.store_id, { value: cur.value + amount(r), count: cur.count + 1 });
  }
  const storeRows = [...perStore]
    .map(([id, v]) => ({ name: names[id] ?? id, value: Math.round(v.value * 100) / 100, sub: `${v.count} ${v.count === 1 ? "bon" : "bonnen"}` }))
    .sort((a, b) => b.value - a.value);

  // Per week/maand
  const keys = bks.map((b) => b.key);
  const perBucket = new Map(keys.map((k) => [k, { value: 0, count: 0 }]));
  for (const r of receipts) {
    const k = bucketOf(r.purchased_on, keys);
    if (!k) continue;
    const cur = perBucket.get(k)!;
    perBucket.set(k, { value: cur.value + amount(r), count: cur.count + 1 });
  }
  const cols = bks.map((b) => ({ ...b, value: Math.round(perBucket.get(b.key)!.value * 100) / 100, count: perBucket.get(b.key)!.count }));

  // Hoe vaak gekocht: afgevinkte lijstregels + bonregels die aan een vast product hangen
  const purchases: Purchase[] = [
    ...listItems.map((i) => ({ day: todayNL(new Date(i.checked_at)), productId: i.product_id, name: i.name })),
    ...receipts.flatMap((r) => r.lines.filter((l) => l.product_id && Number(l.price) > 0).map((l) => ({ day: r.purchased_on, productId: l.product_id, name: l.raw_name }))),
  ];
  // Namen van vaste producten gebruiken waar bekend
  const productIds = [...new Set(purchases.map((p) => p.productId).filter(Boolean))] as string[];
  const productNames = productIds.length
    ? Object.fromEntries(
        (check(await db().from("products").select("id, name, description").in("id", productIds), "producten") as {
          id: string;
          name: string;
          description: string | null;
        }[]).map((p) => [p.id, [p.name, p.description].filter(Boolean).join(" – ")]),
      )
    : {};
  const freq = frequencies(
    purchases.map((p) => ({ ...p, name: p.productId ? (productNames[p.productId] ?? p.name) : p.name })),
    PERIOD_DAYS[period],
  );
  const vaak = freq.filter((f) => f.kind === "vaak");
  const soms = freq.filter((f) => f.kind === "soms");
  const suggest = freq.filter((f) => !f.productId && f.times >= 3);

  const section = "space-y-3 rounded-2xl border border-line bg-surface p-4";
  const h2 = "text-xs font-bold uppercase tracking-wider text-muted";

  return (
    <div className="space-y-5">
      <BackLink href="/bonnen" label="Bonnetjes" />
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <nav aria-label="Periode" className="flex gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard?periode=${p.id}`}
              aria-current={p.id === period ? "page" : undefined}
              className={`flex h-10 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${
                p.id === period ? "border-ink bg-ink text-bg" : "border-line bg-surface"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Uitgegeven</p>
          <p className="text-2xl font-semibold tabular-nums">{euro(total)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Bonnen</p>
          <p className="text-2xl font-semibold tabular-nums">{receipts.length}</p>
        </div>
      </div>

      {receipts.length === 0 && (
        <p className="rounded-2xl bg-surface px-4 py-6 text-center text-muted">
          Nog geen gecontroleerde bonnen in deze periode. Uitgaven verschijnen zodra je bonnetjes toevoegt en controleert.
        </p>
      )}

      <div className="space-y-5 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {storeRows.length > 0 && (
          <section className={section}>
            <h2 className={h2}>Uitgaven per winkel</h2>
            <BarList rows={storeRows} label="Uitgaven per winkel" />
          </section>
        )}
        {receipts.length > 0 && (
          <section className={section}>
            <h2 className={h2}>Uitgaven per {period === "4w" ? "week" : "maand"}</h2>
            <Columns cols={cols} label={`Uitgaven per ${period === "4w" ? "week" : "maand"}`} />
            <details className="text-sm">
              <summary className="cursor-pointer py-1 text-muted">Als tabel</summary>
              <table className="mt-2 w-full tabular-nums">
                <tbody>
                  {cols.map((c) => (
                    <tr key={c.key} className="border-t border-line">
                      <td className="py-1.5">{c.label}</td>
                      <td className="py-1.5 text-right">{euro(c.value)}</td>
                      <td className="py-1.5 text-right text-muted">{c.count} bon{c.count === 1 ? "" : "nen"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>
        )}
      </div>

      {suggest.length > 0 && (
        <section className={section}>
          <h2 className={h2}>Vast maken?</h2>
          <p className="text-sm text-muted">Deze producten koop je vaak, maar ze staan nog niet bij de vaste producten.</p>
          <ul className="divide-y divide-line">
            {suggest.slice(0, 8).map((f) => (
              <li key={f.key} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{f.name}</span>
                  <span className="text-sm text-muted">{f.times}× gekocht</span>
                </span>
                <MakeFixedButton name={f.name} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-5 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <FreqList title="Vaak gekocht" sub="Gemiddeld minstens eens per twee weken" items={vaak} />
        <FreqList title="Soms gekocht" sub="Een paar keer in deze periode" items={soms} />
      </div>
    </div>
  );
}

function FreqList({ title, sub, items }: { title: string; sub: string; items: { key: string; name: string; times: number }[] }) {
  return (
    <section className="space-y-2 rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{title}</h2>
      <p className="text-sm text-muted">{sub}</p>
      {items.length === 0 ? (
        <p className="py-2 text-sm text-muted">Nog niets.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.slice(0, 15).map((f) => (
            <li key={f.key} className="flex items-center justify-between gap-3 py-2 text-[15px]">
              <span className="min-w-0 truncate">{f.name}</span>
              <span className="shrink-0 tabular-nums text-muted">{f.times}×</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
