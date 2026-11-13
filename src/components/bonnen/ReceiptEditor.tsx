"use client";

import { useState, useTransition } from "react";
import { deleteReceipt, saveReceipt } from "@/app/bon-actions";
import { addFreeItem, addProducts } from "@/app/actions";
import { checkTotal } from "@/lib/receipt";
import { IconCheck, IconList, IconPlus, IconTrash } from "../icons";

type Line = { raw_name: string; quantity: number; price: number; product_id: string | null };
type Receipt = { id: string; store_id: string | null; purchased_on: string | null; total: number | null; status: string };

const field = "h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-accent";
const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const fmt = (n: number) => n.toFixed(2).replace(".", ",");

export function ReceiptEditor({
  receipt,
  lines: initial,
  photo,
  stores,
  products,
}: {
  receipt: Receipt;
  lines: Line[];
  photo: string | null;
  stores: { id: string; name: string }[];
  products: { id: string; label: string }[];
}) {
  // Bedragen als tekst bewerken (komma), pas bij opslaan omzetten.
  const [rows, setRows] = useState(initial.map((l) => ({ ...l, qtyText: String(l.quantity).replace(".", ","), priceText: fmt(l.price) })));
  const [storeId, setStoreId] = useState(receipt.store_id ?? "");
  const [date, setDate] = useState(receipt.purchased_on ?? "");
  const [totalText, setTotalText] = useState(receipt.total != null ? fmt(receipt.total) : "");
  const [error, setError] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [pending, start] = useTransition();
  const [onList, setOnList] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);
  const [wipe, setWipe] = useState<string | null>(null); // null = dicht; tekst = bevestigingsveld open

  // Op de boodschappenlijst: gekoppeld vast product als product, anders de naam van de bon.
  const keyOf = (r: { raw_name: string; product_id: string | null }) => r.product_id ?? r.raw_name.trim().toLowerCase();
  const putOnList = async (r: { raw_name: string; product_id: string | null }) => {
    const key = keyOf(r);
    if (!r.raw_name.trim() || onList.has(key)) return;
    setAdding(key);
    try {
      if (r.product_id) await addProducts([r.product_id]);
      else await addFreeItem(r.raw_name.trim());
      setOnList((s) => new Set(s).add(key));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(null);
    }
  };
  const listable = rows.filter((r) => r.raw_name.trim() && num(r.priceText) > 0);
  const notYet = listable.filter((r) => !onList.has(keyOf(r)));
  const putAllOnList = async () => {
    if (!confirm(`${notYet.length} producten van deze bon op de boodschappenlijst zetten?`)) return;
    const seen = new Set<string>();
    for (const r of notYet) {
      if (seen.has(keyOf(r))) continue;
      seen.add(keyOf(r));
      await putOnList(r);
    }
  };

  const parsed = rows.map((r) => ({ price: num(r.priceText) })).filter((r) => Number.isFinite(r.price));
  const total = totalText.trim() ? num(totalText) : null;
  const check = checkTotal(parsed, total != null && Number.isFinite(total) ? total : null);

  const update = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = () =>
    start(async () => {
      setError(null);
      const lines = rows.map((r) => ({ raw_name: r.raw_name, quantity: num(r.qtyText) || 1, price: num(r.priceText), product_id: r.product_id || null }));
      if (lines.some((l) => !l.raw_name.trim() || !Number.isFinite(l.price))) {
        setError("Elke regel heeft een naam en een geldig bedrag nodig.");
        return;
      }
      const res = await saveReceipt({
        id: receipt.id,
        store_id: storeId || null,
        purchased_on: date || null,
        total: total != null && Number.isFinite(total) ? total : null,
        lines,
      });
      if (res?.error) setError(res.error);
    });

  return (
    <div className="space-y-4">
      {photo && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <button onClick={() => setShowPhoto((s) => !s)} className="flex h-12 w-full items-center justify-between px-4 text-sm font-medium">
            Foto van de bon <span className="text-accent">{showPhoto ? "Verbergen" : "Tonen"}</span>
          </button>
          {showPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Foto van de bon" className="max-h-[70vh] w-full object-contain bg-surface-2" />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-3 [&>*]:min-w-0">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-muted">Winkel</span>
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={field}>
            <option value="">Kies…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-muted">Datum</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>
        <label className="col-span-2 block md:col-span-1">
          <span className="mb-1 block text-sm font-medium text-muted">Totaal op de bon (€)</span>
          <input inputMode="decimal" value={totalText} onChange={(e) => setTotalText(e.target.value)} className={field} />
        </label>
      </div>

      <div
        className={`rounded-xl px-4 py-3 text-sm font-medium ${
          check.matches === false ? "bg-danger/10 text-danger" : check.matches ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"
        }`}
      >
        Som van de regels: €{fmt(check.sum)}
        {check.matches === true && " – klopt met het totaal."}
        {check.matches === false && ` – wijkt €${fmt(Math.abs(check.difference!))} af van het totaal. Controleer de regels.`}
      </div>

      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="space-y-2 rounded-2xl border border-line bg-surface p-3">
            <div className="flex gap-2">
              <input
                value={r.raw_name}
                onChange={(e) => update(i, { raw_name: e.target.value })}
                aria-label={`Regel ${i + 1}: naam op de bon`}
                className={`${field} min-w-0 flex-1 font-medium`}
              />
              {num(r.priceText) > 0 && (
                <button
                  onClick={() => putOnList(r)}
                  disabled={adding !== null || onList.has(keyOf(r)) || !r.raw_name.trim()}
                  aria-label={onList.has(keyOf(r)) ? `${r.raw_name} staat op de lijst` : `${r.raw_name} op de boodschappenlijst zetten`}
                  title="Op de boodschappenlijst"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                    onList.has(keyOf(r)) ? "border-accent bg-accent text-accent-ink" : "border-line text-accent"
                  } ${adding === keyOf(r) ? "opacity-50" : ""}`}
                >
                  {onList.has(keyOf(r)) ? <IconCheck className="h-5 w-5" /> : <IconList className="h-5 w-5" />}
                </button>
              )}
              <button
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                aria-label={`Regel ${i + 1} verwijderen`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted"
              >
                <IconTrash className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-[4.5rem_6rem_1fr] gap-2">
              <input inputMode="decimal" value={r.qtyText} onChange={(e) => update(i, { qtyText: e.target.value })} aria-label="Aantal" className={`${field} text-center`} />
              <input inputMode="decimal" value={r.priceText} onChange={(e) => update(i, { priceText: e.target.value })} aria-label="Bedrag" className={`${field} text-right tabular-nums`} />
              <select
                value={r.product_id ?? ""}
                onChange={(e) => update(i, { product_id: e.target.value || null })}
                aria-label="Vast product"
                className={`${field} min-w-0 text-sm ${r.product_id ? "text-ink" : "text-muted"}`}
              >
                <option value="">Geen vast product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>

      <button
        onClick={() => setRows((rs) => [...rs, { raw_name: "", quantity: 1, price: 0, product_id: null, qtyText: "1", priceText: "" }])}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[15px] font-medium text-muted"
      >
        <IconPlus className="h-5 w-5" /> Regel toevoegen
      </button>

      {notYet.length > 0 && (
        <button
          onClick={putAllOnList}
          disabled={adding !== null}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-[15px] font-medium text-accent disabled:opacity-60"
        >
          <IconList className="h-5 w-5" /> {adding ? "Op de lijst zetten…" : `Alles op de boodschappenlijst (${notYet.length})`}
        </button>
      )}

      <p className="px-1 text-xs text-muted">
        Met het lijst-icoon zet je een product van de bon direct op de boodschappenlijst. Rechtsonder per regel: welk <strong>vast product</strong> het is. De app vult dat zelf in waar het kan; klopt het niet, kies dan een ander of „Geen vast product”. Zo volgt het dashboard de prijs (duurder of goedkoper) en onthoudt de app de naam op de bon. De bon telt ook mee zonder op te slaan.
      </p>

      {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}

      <button onClick={save} disabled={pending} className="w-full rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-accent-ink disabled:opacity-60">
        {pending ? "Opslaan…" : receipt.status === "nieuw" ? "Klopt, opslaan" : "Opslaan"}
      </button>
      {wipe === null ? (
        <button
          onClick={() => setWipe("")}
          disabled={pending}
          className="h-12 w-full rounded-2xl border border-danger/40 text-[15px] font-medium text-danger"
        >
          Bon verwijderen
        </button>
      ) : (
        <div className="space-y-3 rounded-2xl border border-danger/40 bg-danger/5 p-4">
          <p className="text-sm">
            De bon, de foto en alle regels worden <strong>definitief</strong> verwijderd; ook uit het dashboard. Typ <strong>WISSEN</strong> om te bevestigen.
          </p>
          <input
            value={wipe}
            onChange={(e) => setWipe(e.target.value)}
            placeholder="WISSEN"
            aria-label="Typ WISSEN om te bevestigen"
            autoCapitalize="characters"
            autoComplete="off"
            autoFocus
            className={`${field} h-12 text-[17px] uppercase tracking-wider`}
          />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setWipe(null)} className="h-12 rounded-xl border border-line bg-surface text-[15px] font-medium">
              Annuleren
            </button>
            <button
              onClick={() => start(() => deleteReceipt(receipt.id, wipe.trim().toUpperCase()))}
              disabled={pending || wipe.trim().toUpperCase() !== "WISSEN"}
              className="h-12 rounded-xl bg-danger text-[15px] font-semibold text-white disabled:opacity-40"
            >
              {pending ? "Wissen…" : "Definitief wissen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
