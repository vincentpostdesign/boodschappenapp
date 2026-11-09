import { notFound } from "next/navigation";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { getProducts, getStores } from "@/lib/data";
import { photoUrl } from "@/lib/vision";
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
    db().from("receipt_lines").select("raw_name, quantity, price, product_id").eq("receipt_id", id).order("line_no"),
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
  } | null;
  if (!receipt) notFound();
  const lines = (check(linesRes, "regels") as { raw_name: string; quantity: number; price: number; product_id: string | null }[]).map((l) => ({
    ...l,
    quantity: Number(l.quantity),
    price: Number(l.price),
  }));

  return (
    <div className="space-y-4">
      <BackLink href="/bonnen" label="Bonnetjes" />
      <h1 className="text-2xl font-semibold tracking-tight">{receipt.status === "nieuw" ? "Bon controleren" : "Bon"}</h1>
      {melding && <p className="rounded-xl bg-deal-soft px-4 py-3 text-sm text-deal">{melding}</p>}
      <ReceiptEditor
        receipt={{ ...receipt, total: receipt.total != null ? Number(receipt.total) : null }}
        lines={lines}
        photo={await photoUrl(receipt.photo_path)}
        stores={stores.map((s) => ({ id: s.id, name: s.name }))}
        products={products.map((p) => ({ id: p.id, label: [p.name, p.description].filter(Boolean).join(" – ") }))}
      />
    </div>
  );
}
