"use client";

import { useState, useTransition } from "react";
import { newId, runOrQueue } from "@/lib/offline-queue";
import { addScoupyLink, type ShareResult } from "@/app/scoupy-actions";
import { IconCheck, IconList, IconPlus, IconSearch } from "../icons";

/**
 * Persoonlijke acties (bijv. Optimel voor €0,01) staan niet in de openbare Scoupy-lijst.
 * In de Scoupy-app: actie openen → deel-icoon → Kopieer → hier plakken.
 */
function ShareLink() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ShareResult | null>(null);
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    start(async () => {
      const r = await addScoupyLink(text);
      setResult(r);
      if (r.ok) setText("");
    });
  };
  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setText(t);
    } catch {
      /* geen toegang tot klembord: gewoon zelf plakken */
    }
  };
  return (
    <form onSubmit={submit} className="space-y-2 rounded-2xl border border-line bg-surface p-3">
      <p className="text-sm text-muted">
        Actie uit de Scoupy-app die hier niet staat? Open hem in Scoupy, tik op het deel-icoon, kies <strong className="text-ink">Kopieer</strong> en plak de link hier.
      </p>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => !text && paste()}
          placeholder="Plak de Scoupy-link…"
          aria-label="Scoupy-link"
          inputMode="url"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[16px] outline-none focus:border-accent"
        />
        <button
          disabled={pending || !text.trim()}
          aria-label="Scoupy-actie toevoegen"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink disabled:opacity-50"
        >
          <IconPlus className="h-5 w-5" />
        </button>
      </div>
      {pending && <p className="text-sm text-muted">Actie ophalen…</p>}
      {result?.ok && <p className="text-sm font-medium text-accent">{result.ok}</p>}
      {result?.error && <p className="text-sm text-danger">{result.error}</p>}
    </form>
  );
}

export type ScoupyView = { id: number; title: string; product: string; brand: string; short: string; stores: string; until: string; image: string | null; onList: boolean };

/** Lopende Scoupy-acties (cashback-app van Marleen): zoeken en met één tik op de boodschappenlijst. */
export function ScoupyDeals({ deals, updated }: { deals: ScoupyView[]; updated: string | null }) {
  const [q, setQ] = useState("");
  const [added, setAdded] = useState<Set<number>>(new Set());
  const needle = q.trim().toLowerCase();
  const shown = needle ? deals.filter((d) => `${d.title} ${d.product} ${d.brand}`.toLowerCase().includes(needle)) : deals;

  const add = (d: ScoupyView) => {
    setAdded((s) => new Set(s).add(d.id));
    void runOrQueue({ k: "add", id: newId(), text: d.product });
  };

  return (
    <section className="space-y-3" aria-labelledby="scoupy-kop">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 id="scoupy-kop" className="text-xs font-bold uppercase tracking-wider text-muted">
          Scoupy-acties · {deals.length}
        </h2>
        {updated && <span className="text-xs text-muted">bijgewerkt {updated}</span>}
      </div>
      <ShareLink />
      {deals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Nog geen Scoupy-acties opgehaald. Kijk over een paar minuten nog eens.
        </p>
      ) : (
        <>
          <label className="flex h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-3">
            <IconSearch className="h-5 w-5 shrink-0 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoek in Scoupy-acties…"
              aria-label="Zoek in Scoupy-acties"
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
            />
          </label>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {shown.map((d) => {
              const done = d.onList || added.has(d.id);
              return (
                <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                  {d.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain" />
                  ) : (
                    <span className="h-14 w-14 shrink-0 rounded-xl bg-surface-2" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[15px] font-medium leading-snug">{d.product}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span className="rounded-md bg-[#fde8ec] px-1.5 py-0.5 font-semibold text-[#b0213e]">{d.short || "cashback"}</span>
                      {d.stores && <span>{d.stores}</span>}
                      <span>t/m {d.until}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => add(d)}
                    disabled={done}
                    aria-label={done ? `${d.product} staat op de lijst` : `${d.product} op de boodschappenlijst zetten`}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                      done ? "border-accent bg-accent text-accent-ink" : "border-line text-accent"
                    }`}
                  >
                    {done ? <IconCheck className="h-5 w-5" /> : <IconList className="h-5 w-5" />}
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Geen actie gevonden voor “{q}”.</li>}
          </ul>
          <p className="px-1 text-xs text-muted">
            Uit de Scoupy-app: koop het product, scan je bon in Scoupy en krijg het geld terug. Op = op: acties hebben een maximum aantal deelnemers.
          </p>
        </>
      )}
    </section>
  );
}
