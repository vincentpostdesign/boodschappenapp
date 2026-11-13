"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { addAllFixedProducts, setProductQuantity } from "@/app/actions";
import { normalize } from "@/lib/route";
import { IconPlus, IconSearch } from "./icons";
import { Stepper } from "./Stepper";
import { SwipeToDelete } from "./SwipeToDelete";
import { ConfirmWipe } from "./ConfirmWipe";
import { removeFixedProduct, updateFixedProduct } from "@/app/beheer-actions";

/** onList = aantal op de lijst (0 = staat er niet op). */
type P = { id: string; name: string; description: string | null; quantity: number; onList: number; departmentId: string };
type Group = { key: string; name: string; products: P[] };
type Dep = { id: string; name: string };

export function FixedProducts({
  groups,
  storeName,
  storeId,
  departments,
}: {
  groups: Group[];
  storeName: string;
  storeId: string;
  departments: Dep[];
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [, start] = useTransition();
  const [swipeOpen, setSwipeOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<P | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  // Optimistisch: aantallen direct tonen, de server volgt.
  const [counts, setCount] = useOptimistic(new Map<string, number>(), (m, [id, n]: [string, number]) => new Map(m).set(id, n));

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return groups;
    return groups
      .map((g) => ({ ...g, products: g.products.filter((p) => normalize(`${p.name} ${p.description ?? ""} ${g.name}`).includes(q)) }))
      .filter((g) => g.products.length);
  }, [groups, query]);

  const all = groups.flatMap((g) => g.products);
  const countOf = (p: P) => counts.get(p.id) ?? p.onList;
  const remaining = all.filter((p) => countOf(p) === 0);

  const change = (p: P, n: number) =>
    start(async () => {
      setCount([p.id, n]);
      await setProductQuantity(p.id, n);
    });

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Vaste producten</h1>
        <label className="flex h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-4 focus-within:border-accent">
          <IconSearch className="h-5 w-5 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoeken…"
            aria-label="Zoek in vaste producten"
            className="h-full min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-muted"
          />
        </label>
        <button
          disabled={remaining.length === 0}
          onClick={() =>
            start(async () => {
              for (const p of remaining) setCount([p.id, p.quantity]);
              await addAllFixedProducts();
            })
          }
          className="h-12 w-full rounded-2xl bg-accent px-4 text-[15px] font-semibold text-accent-ink disabled:bg-surface-2 disabled:text-muted"
        >
          {remaining.length === 0 ? "Alle vaste producten staan op de lijst" : `Zet alle vaste producten erop (${remaining.length})`}
        </button>
        <p className="px-1 text-xs text-muted">
          Ingedeeld volgens de looproute van de {storeName}. Met + zet je iets op de lijst. Tik op een product om het aan te passen; veeg naar links om het te verwijderen.
        </p>
      </header>
      {confirm && (
        <ConfirmWipe
          title="Vast product verwijderen?"
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const p = confirm;
            setGone((s) => new Set(s).add(p.id));
            setConfirm(null);
            await removeFixedProduct(p.id, "WISSEN");
          }}
        >
          <strong className="text-ink">{[confirm.name, confirm.description].filter(Boolean).join(" – ")}</strong> verdwijnt uit de vaste producten. Staat het nu op de lijst, dan blijft het daar gewoon staan; bonnen en historie blijven bewaard.
        </ConfirmWipe>
      )}

      {filtered.length === 0 && <p className="py-8 text-center text-muted">Niets gevonden voor “{query}”.</p>}

      <div className="space-y-5 md:grid md:grid-cols-2 md:gap-x-4 md:space-y-0 md:gap-y-5">
        {filtered.map((g) => (
          <section key={g.key} aria-label={g.name}>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">{g.name}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {g.products.map((p) => {
                const n = countOf(p);
                if (gone.has(p.id)) return null;
                return (
                  <li key={p.id}>
                    <SwipeToDelete
                      open={swipeOpen === p.id}
                      onOpenChange={(o) => setSwipeOpen(o ? p.id : null)}
                      onDelete={() => {
                        setSwipeOpen(null);
                        setConfirm(p);
                      }}
                      label={p.name}
                    >
                  <div className={`flex min-h-16 items-center gap-3 px-4 py-2 ${n ? "bg-[color-mix(in_srgb,var(--accent-soft)_50%,var(--surface))]" : "bg-surface"}`}>
                    <button
                      type="button"
                      onClick={() => setEditing(editing === p.id ? null : p.id)}
                      aria-expanded={editing === p.id}
                      aria-label={`${p.name} aanpassen`}
                      className="min-w-0 flex-1 py-1 text-left"
                    >
                      <span className="block text-[17px] font-medium leading-tight">{p.name}</span>
                      <span className="block truncate text-sm text-muted">
                        {n ? <span className="font-medium text-accent">Op de lijst</span> : p.description}
                        {n && p.description ? ` · ${p.description}` : ""}
                      </span>
                    </button>
                    {n ? (
                      <Stepper value={n} min={0} label={p.name} onChange={(next) => change(p, next)} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => change(p, p.quantity)}
                        aria-label={`${p.name} op de lijst zetten`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-accent"
                      >
                        <IconPlus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                    </SwipeToDelete>
                    {editing === p.id && (
                      <EditFixed product={p} storeId={storeId} storeName={storeName} departments={departments} onClose={() => setEditing(null)} />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Tik op een vast product: naam, omschrijving, standaard aantal en afdeling (in de gekozen winkel) aanpassen. */
function EditFixed({
  product: p,
  storeId,
  storeName,
  departments,
  onClose,
}: {
  product: P;
  storeId: string;
  storeName: string;
  departments: Dep[];
  onClose: () => void;
}) {
  const [name, setName] = useState(p.name);
  const [description, setDescription] = useState(p.description ?? "");
  const [quantity, setQuantity] = useState(p.quantity);
  const [departmentId, setDepartmentId] = useState(p.departmentId);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const field = "h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-[16px] outline-none focus:border-accent";
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await updateFixedProduct(p.id, { name, description, quantity, storeId, departmentId });
      if (r?.error) return setError(r.error);
      onClose();
    });
  };
  return (
    <form onSubmit={save} className="space-y-2 border-t border-line bg-surface-2/60 px-4 py-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 [&>*]:min-w-0">
        <label className="block">
          <span className="mb-1 block px-1 text-xs font-medium text-muted">Naam</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="off" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block px-1 text-xs font-medium text-muted">Omschrijving</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={160}
            placeholder="Merk, smaak, grootte"
            autoComplete="off"
            className={field}
          />
        </label>
      </div>
      <div className="grid grid-cols-[auto_1fr] items-end gap-3 [&>*]:min-w-0">
        <div>
          <span className="mb-1 block px-1 text-xs font-medium text-muted">Standaard aantal</span>
          <Stepper value={quantity} min={1} label={`${p.name} standaard aantal`} onChange={setQuantity} />
        </div>
        <label className="block">
          <span className="mb-1 block px-1 text-xs font-medium text-muted">Afdeling bij de {storeName}</span>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={field}>
            <option value="">Overig / geen</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-line bg-surface text-[15px] font-medium">
          Annuleren
        </button>
        <button disabled={pending || !name.trim()} className="h-11 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-50">
          {pending ? "Opslaan…" : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
