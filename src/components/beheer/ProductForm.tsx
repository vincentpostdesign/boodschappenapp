"use client";

import { useActionState, useTransition } from "react";
import { deleteProduct, saveProduct, setProductHidden } from "@/app/beheer-actions";
import type { Product } from "@/lib/types";

type StoreOpt = { id: string; name: string; isDefault: boolean; departments: { id: string; name: string }[] };

const field = "h-12 w-full rounded-xl border border-line bg-surface px-3 text-[17px] outline-none focus:border-accent";
const label = "mb-1 block text-sm font-medium text-muted";

export function ProductForm({ product, stores, current }: { product: Product | null; stores: StoreOpt[]; current: Record<string, string> }) {
  const [state, action, saving] = useActionState(saveProduct, undefined);
  const [busy, start] = useTransition();
  const defaultStore = product?.default_store_id ?? stores.find((s) => s.isDefault)?.id ?? stores[0]?.id;

  return (
    <form action={action} className="space-y-5">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
        <div>
          <label htmlFor="name" className={label}>Naam</label>
          <input id="name" name="name" required maxLength={80} defaultValue={product?.name ?? ""} className={field} autoFocus={!product} />
        </div>
        <div>
          <label htmlFor="description" className={label}>Omschrijving</label>
          <input
            id="description"
            name="description"
            maxLength={160}
            defaultValue={product?.description ?? ""}
            placeholder="Bijv. halfvolle melk, 2 liter"
            className={field}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="default_quantity" className={label}>Gebruikelijk aantal</label>
            <input
              id="default_quantity"
              name="default_quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              defaultValue={product?.default_quantity ?? 1}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="default_store_id" className={label}>Standaardwinkel</label>
            <select id="default_store_id" name="default_store_id" defaultValue={defaultStore} className={field}>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wider text-muted">Afdeling per winkel</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {stores.map((s) => (
            <div key={s.id}>
              <label htmlFor={`dep_${s.id}`} className={label}>{s.name}</label>
              <select id={`dep_${s.id}`} name={`dep_${s.id}`} defaultValue={current[s.id] ?? ""} className={field}>
                <option value="">— Onbekend (komt onder Overig)</option>
                {s.departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </fieldset>

      {state?.error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{state.error}</p>}

      <button disabled={saving} className="h-13 w-full rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-accent-ink disabled:opacity-60">
        {saving ? "Opslaan…" : "Opslaan"}
      </button>

      {product && (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => start(() => setProductHidden(product.id, !product.hidden))}
            className="h-12 flex-1 rounded-2xl border border-line bg-surface text-[15px] font-medium"
          >
            {product.hidden ? "Weer tonen" : "Verbergen (seizoen)"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirm(`"${product.name}" definitief verwijderen? Bonnetjes en historie blijven bewaard.`)) start(() => deleteProduct(product.id));
            }}
            className="h-12 flex-1 rounded-2xl border border-danger/40 text-[15px] font-medium text-danger"
          >
            Verwijderen
          </button>
        </div>
      )}
    </form>
  );
}
