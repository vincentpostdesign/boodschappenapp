"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { bumpVersion } from "@/lib/version";
import { TAG_PRIJZEN } from "@/lib/data";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, check } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { cleanLines, unitPrice } from "@/lib/receipt";

const lineSchema = z.object({
  raw_name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().max(1000),
  price: z.number().min(-1000).max(1000),
  product_id: z.string().uuid().nullable(),
});
const receiptSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().min(1).nullable(),
  purchased_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  total: z.number().min(0).max(10000).nullable(),
  lines: z.array(lineSchema).max(300),
});
export type ReceiptInput = z.infer<typeof receiptSchema>;

/**
 * Gecontroleerde bon opslaan:
 * - regels vervangen,
 * - bonnaam -> vast product leren als alias (per winkel),
 * - prijs per stuk als referentieprijs bewaren (bijv. voor de Aldi, die in de prijsbron ontbreekt).
 */
export async function saveReceipt(input: ReceiptInput): Promise<{ error?: string }> {
  await requirePerson();
  const parsed = receiptSchema.safeParse(input);
  if (!parsed.success) return { error: "Controleer de regels: elke regel heeft een naam en een bedrag nodig." };
  const r = parsed.data;
  if (!r.store_id) return { error: "Kies de winkel van de bon." };
  if (!r.purchased_on) return { error: "Vul de datum van de bon in." };

  const lines = r.lines
    .flatMap((l) => cleanLines([{ naam: l.raw_name, aantal: l.quantity, prijs: l.price }]).map((c) => ({ ...c, product_id: l.product_id })))
    .map((l, i) => ({ ...l, line_no: i + 1 }));

  check(
    await db().from("receipts").update({ store_id: r.store_id, purchased_on: r.purchased_on, total: r.total, status: "gecontroleerd" }).eq("id", r.id),
    "bon opslaan",
  );
  check(await db().from("receipt_lines").delete().eq("receipt_id", r.id), "oude regels");
  if (lines.length) check(await db().from("receipt_lines").insert(lines.map((l) => ({ ...l, receipt_id: r.id }))), "regels opslaan");

  const linked = lines.filter((l) => l.product_id);
  if (linked.length) {
    // Aliassen leren (laatste koppeling wint)
    const uniq = new Map(linked.map((l) => [l.raw_name.toLowerCase(), l]));
    check(
      await db()
        .from("product_aliases")
        .upsert([...uniq.values()].map((l) => ({ store_id: r.store_id!, alias: l.raw_name, product_id: l.product_id! })), { onConflict: "store_id,alias" }),
      "aliassen",
    );
    // Referentieprijzen: alleen bijwerken als deze bon even nieuw of nieuwer is dan de bekende prijs
    const observed = `${r.purchased_on}T12:00:00Z`;
    const existing = check(
      await db().from("product_prices").select("product_id, observed_at").eq("store_id", r.store_id).in("product_id", linked.map((l) => l.product_id!)),
      "prijzen",
    ) as { product_id: string; observed_at: string }[];
    const known = new Map(existing.map((e) => [e.product_id, e.observed_at]));
    const prices = new Map<string, number>();
    for (const l of linked) {
      const p = unitPrice(l);
      if (p == null) continue;
      if ((known.get(l.product_id!) ?? "") > observed) continue;
      prices.set(l.product_id!, p);
    }
    if (prices.size) {
      check(
        await db()
          .from("product_prices")
          .upsert([...prices].map(([product_id, price]) => ({ product_id, store_id: r.store_id!, price, source: "bon", observed_at: observed }))),
        "referentieprijzen",
      );
    }
  }
  revalidateTag(TAG_PRIJZEN);
  revalidatePath("/", "layout");
  after(bumpVersion);
  redirect("/bonnen");
}

export async function deleteReceipt(id: string, confirmation: string) {
  await requirePerson();
  // Tweede stap: alleen wissen als in de app WISSEN is getypt.
  if (confirmation !== "WISSEN") throw new Error("Typ WISSEN om de bon te verwijderen");
  const row = check(await db().from("receipts").select("photo_path").eq("id", id).maybeSingle(), "bon") as { photo_path: string } | null;
  check(await db().from("receipts").delete().eq("id", id), "bon verwijderen");
  if (row?.photo_path) await db().storage.from("fotos").remove([row.photo_path]);
  revalidateTag(TAG_PRIJZEN);
  revalidatePath("/", "layout");
  after(bumpVersion);
  redirect("/bonnen");
}
