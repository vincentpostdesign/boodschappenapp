import { notFound } from "next/navigation";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { getProducts, getStores } from "@/lib/data";
import { photoUrl, tidyNames, visionAvailable } from "@/lib/vision";
import { niceCase, suggestProduct } from "@/lib/receipt";

/**
 * Oudere bonnen staan nog in HOOFDLETTERS: bij openen eenmalig omzetten naar gewone schrijfwijze
 * (Claude zet merknamen goed; zonder sleutel of bij een fout gewoon eerste letter hoofdletter) en opslaan.
 */
async function tidyStoredNames<L extends { id: string; raw_name: string }>(lines: L[]): Promise<L[]> {
  const caps = lines.filter((l) => niceCase(l.raw_name) !== l.raw_name);
  if (!caps.length) return lines;
  let names = caps.map((l) => niceCase(l.raw_name));
  if (visionAvailable()) {
    try {
      const tidy = await tidyNames(caps.map((l) => l.raw_name));
      names = tidy.map((n, i) => (niceCase(n) === n ? n : names[i]));
    } catch {
      /* eenvoudige omzetting volstaat */
    }
  }
  const byId = new Map(caps.map((l, i) => [l.id, names[i]]));
  await Promise.all(caps.map((l) => db().from("receipt_lines").update({ raw_name: byId.get(l.id)! }).eq("id", l.id)));
  return lines.map((l) => (byId.has(l.id) ? { ...l, raw_name: byId.get(l.id)! } : l));
}
import { ReceiptEditor } from "@/components/bonnen/ReceiptEditor";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bon controleren · Boodschappen" };

export default async function BonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ melding?: string }> }) {
  await requirePerson();
  const { id } = await params;
  const { melding } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [receiptRes, linesRes, stores, products] = await Promise.all([
    db().from("receipts").select("*").eq("id", id).maybeSingle(),
    db().from("receipt_lines").select("id, raw_name, quantity, price, product_id").eq("receipt_id", id).order("line_no"),
    getStores(),
    getProducts({ includeHidden: true }),
  ]);
  const receipt = check(receiptRes, "bon") as {
    id: string;
    store_id: string | null;
    purchased_on: string | null;
    total: number | null;
    photo_path: string;
    status: string;
    reading?: boolean;
    read_note?: string | null;
    created_at: string;
  } | null;
  if (!receipt) notFound();
  const reading = !!receipt.reading && Date.now() - new Date(receipt.created_at).getTime() < 3 * 60_000;
  const note = melding ?? (receipt.status === "nieuw" ? receipt.read_note : null);
  if (reading) {
    return (
      <div className="space-y-4">
        <BackLink href="/bonnen" label="Bonnetjes" />
        <h1 className="text-2xl font-semibold tracking-tight">Bon wordt uitgelezen…</h1>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-5">
          <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-[3px] border-accent/25 border-t-accent" aria-hidden />
          <p className="text-[15px]">
            Dit duurt meestal een halve minuut. Je kunt gewoon verder in de app; dit scherm ververst vanzelf en je krijgt een melding als het klaar is.
          </p>
        </div>
      </div>
    );
  }
  const tidied = await tidyStoredNames(
    (check(linesRes, "regels") as { id: string; raw_name: string; quantity: number; price: number; product_id: string | null }[]).map((l) => ({
      ...l,
      quantity: Number(l.quantity),
      price: Number(l.price),
    })),
  );
  // Nog niet gecontroleerde bon: ontbrekende koppelingen voorstellen én bewaren, zodat ze meetellen in het prijsverloop.
  const suggested = new Map<string, string>();
  if (receipt.status === "nieuw") {
    for (const l of tidied) {
      if (l.product_id || l.price <= 0) continue;
      const p = suggestProduct(l.raw_name, products);
      if (p) suggested.set(l.id, p);
    }
    await Promise.all([...suggested].map(([id, p]) => db().from("receipt_lines").update({ product_id: p }).eq("id", id)));
  }
  const lines = tidied.map((l) => (suggested.has(l.id) ? { ...l, product_id: suggested.get(l.id)! } : l));

  return (
    <div className="space-y-4">
      <BackLink href="/bonnen" label="Bonnetjes" />
      <h1 className="text-2xl font-semibold tracking-tight">{receipt.status === "nieuw" ? "Bon controleren" : "Bon"}</h1>
      {note && <p className="rounded-xl bg-deal-soft px-4 py-3 text-sm text-deal">{note}</p>}
      <ReceiptEditor
        key={`${lines.length}-${receipt.store_id}-${receipt.total}`}
        receipt={{ ...receipt, total: receipt.total != null ? Number(receipt.total) : null }}
        lines={lines}
        photo={await photoUrl(receipt.photo_path)}
        stores={stores.map((s) => ({ id: s.id, name: s.name }))}
        products={products.map((p) => ({ id: p.id, label: [p.name, p.description].filter(Boolean).join(" – ") }))}
      />
    </div>
  );
}
