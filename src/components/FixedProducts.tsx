"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { addAllFixedProducts, setProductQuantity } from "@/app/actions";
import { normalize } from "@/lib/route";
import { IconPlus, IconSearch } from "./icons";
import { Stepper } from "./Stepper";
import { SwipeToDelete } from "./SwipeToDelete";
import { ConfirmWipe } from "./ConfirmWipe";
import { removeFixedProduct } from "@/app/beheer-actions";

/** onList = aantal op de lijst (0 = staat er niet op). */
type P = { id: string; name: string; description: string | null; quantity: number; onList: number };
type Group = { key: string; name: string; products: P[] };

export function FixedProducts({ groups, storeName }: { groups: Group[]; storeName: string }) {
  const [query, setQuery] = useState("");
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
          Ingedeeld volgens de looproute van de {storeName}. Met + zet je iets op de lijst; tik nog eens voor meer. Veeg naar links om een vast product te verwijderen.
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
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-medium leading-tight">{p.name}</span>
                      <span className="block truncate text-sm text-muted">
                        {n ? <span className="font-medium text-accent">Op de lijst</span> : p.description}
                        {n && p.description ? ` · ${p.description}` : ""}
                      </span>
                    </span>
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
