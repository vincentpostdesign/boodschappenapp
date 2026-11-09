"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { setProductHidden } from "@/app/beheer-actions";
import { normalize } from "@/lib/route";
import { IconPlus, IconSearch } from "../icons";

type Row = { id: string; name: string; description: string | null; hidden: boolean; store: string | null; quantity: number };

export function ProductAdmin({ products }: { products: Row[] }) {
  const [query, setQuery] = useState("");
  const [, start] = useTransition();
  const filtered = useMemo(() => {
    const q = normalize(query);
    return q ? products.filter((p) => normalize(`${p.name} ${p.description ?? ""}`).includes(q)) : products;
  }, [products, query]);
  const visible = filtered.filter((p) => !p.hidden);
  const hidden = filtered.filter((p) => p.hidden);

  const list = (rows: Row[]) => (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {rows.map((p) => (
        <li key={p.id} className="flex items-center gap-2 pr-2">
          <Link href={`/beheer/producten/${p.id}`} className={`min-w-0 flex-1 px-4 py-3 ${p.hidden ? "opacity-60" : ""}`}>
            <span className="block font-medium leading-tight">
              {p.quantity > 1 && <span className="mr-1 text-accent">{p.quantity}×</span>}
              {p.name}
            </span>
            <span className="block truncate text-sm text-muted">
              {[p.description, p.store].filter(Boolean).join(" · ") || "Geen omschrijving"}
            </span>
          </Link>
          <button
            onClick={() => start(() => setProductHidden(p.id, !p.hidden))}
            className="h-10 shrink-0 whitespace-nowrap rounded-xl border border-line px-3 text-sm font-medium text-muted"
          >
            {p.hidden ? "Tonen" : "Verbergen"}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Vaste producten</h1>
        <Link
          href="/beheer/producten/nieuw"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink"
        >
          <IconPlus className="h-5 w-5" /> Nieuw
        </Link>
      </div>
      <label className="flex h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-4 focus-within:border-accent">
        <IconSearch className="h-5 w-5 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek in alle vaste producten…"
          aria-label="Zoek in alle vaste producten"
          className="h-full min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-muted"
        />
      </label>
      {filtered.length === 0 && <p className="py-6 text-center text-muted">Niets gevonden.</p>}
      {visible.length > 0 && list(visible)}
      {hidden.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted">Verborgen (bijv. seizoen) · {hidden.length}</h2>
          {list(hidden)}
        </section>
      )}
    </div>
  );
}
