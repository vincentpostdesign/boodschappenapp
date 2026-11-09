"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { addAllFixedProducts, addProducts } from "@/app/actions";
import { normalize } from "@/lib/route";
import { IconCheck, IconPlus, IconSearch } from "./icons";

type P = { id: string; name: string; description: string | null; quantity: number; onList: boolean };
type Group = { key: string; name: string; products: P[] };

export function FixedProducts({ groups, storeName }: { groups: Group[]; storeName: string }) {
  const [query, setQuery] = useState("");
  const [, start] = useTransition();
  const [added, markAdded] = useOptimistic(new Set<string>(), (s, ids: string[]) => new Set([...s, ...ids]));

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return groups;
    return groups
      .map((g) => ({ ...g, products: g.products.filter((p) => normalize(`${p.name} ${p.description ?? ""} ${g.name}`).includes(q)) }))
      .filter((g) => g.products.length);
  }, [groups, query]);

  const all = groups.flatMap((g) => g.products);
  const isOn = (p: P) => p.onList || added.has(p.id);
  const remaining = all.filter((p) => !isOn(p));

  const add = (ids: string[]) =>
    start(async () => {
      markAdded(ids);
      await addProducts(ids);
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
              markAdded(remaining.map((p) => p.id));
              await addAllFixedProducts();
            })
          }
          className="h-12 w-full rounded-2xl bg-accent px-4 text-[15px] font-semibold text-accent-ink disabled:bg-surface-2 disabled:text-muted"
        >
          {remaining.length === 0 ? "Alle vaste producten staan op de lijst" : `Zet alle vaste producten erop (${remaining.length})`}
        </button>
        <p className="px-1 text-xs text-muted">Ingedeeld volgens de looproute van de {storeName}.</p>
      </header>

      {filtered.length === 0 && <p className="py-8 text-center text-muted">Niets gevonden voor “{query}”.</p>}

      <div className="space-y-5 md:grid md:grid-cols-2 md:gap-x-4 md:space-y-0 md:gap-y-5">
        {filtered.map((g) => (
          <section key={g.key} aria-label={g.name}>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">{g.name}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {g.products.map((p) => {
                const on = isOn(p);
                return (
                  <li key={p.id}>
                    <button
                      disabled={on}
                      onClick={() => add([p.id])}
                      className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[17px] font-medium leading-tight">{p.name}</span>
                        {p.description && <span className="block truncate text-sm text-muted">{p.description}</span>}
                      </span>
                      {on ? (
                        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
                          <IconCheck className="h-3.5 w-3.5" /> Op de lijst
                        </span>
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-accent">
                          <IconPlus className="h-5 w-5" />
                        </span>
                      )}
                    </button>
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
