"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteReceipt } from "@/app/bon-actions";
import { SwipeToDelete } from "../SwipeToDelete";

export type ReceiptRow = {
  id: string;
  title: string; // "Aldi · vr 13 nov"
  lines: number;
  total: string; // "€ 62,43" of "—"
  check: boolean; // nog te controleren
  reading: boolean; // wordt uitgelezen
  duplicate: boolean; // zelfde winkel, datum en bedrag als een andere bon
};

/** Overzicht van bonnen; naar links vegen om te verwijderen, met WISSEN als bevestiging. */
export function ReceiptList({ rows }: { rows: ReceiptRow[] }) {
  const [swipeOpen, setSwipeOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ReceiptRow | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const shown = rows.filter((r) => !gone.has(r.id));

  return (
    <>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {shown.map((r) => (
          <li key={r.id}>
            <SwipeToDelete
              open={swipeOpen === r.id}
              onOpenChange={(o) => setSwipeOpen(o ? r.id : null)}
              onDelete={() => {
                setSwipeOpen(null);
                setConfirm(r);
              }}
              label={`Bon ${r.title}`}
            >
              <Link href={`/bonnen/${r.id}`} className="flex min-h-16 items-center gap-3 bg-surface px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{r.title}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                    {r.reading ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-accent">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/25 border-t-accent" aria-hidden />
                        Wordt uitgelezen…
                      </span>
                    ) : (
                      <span>{r.lines} regels</span>
                    )}
                    {r.duplicate && <span className="rounded-md bg-danger/10 px-1.5 text-xs font-semibold text-danger">Lijkt dubbel</span>}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{r.total}</span>
                  {r.check && <span className="block text-xs font-semibold text-deal">Controleren</span>}
                </span>
              </Link>
            </SwipeToDelete>
          </li>
        ))}
      </ul>
      <p className="px-1 text-xs text-muted">Veeg een bon naar links om hem te verwijderen.</p>
      {confirm && (
        <ConfirmWipe
          row={confirm}
          onCancel={() => setConfirm(null)}
          onDone={(id) => {
            setGone((s) => new Set(s).add(id));
            setConfirm(null);
          }}
        />
      )}
    </>
  );
}

function ConfirmWipe({ row, onCancel, onDone }: { row: ReceiptRow; onCancel: () => void; onDone: (id: string) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ok = text.trim().toUpperCase() === "WISSEN";
  const wipe = () =>
    start(async () => {
      try {
        onDone(row.id);
        await deleteReceipt(row.id, "WISSEN");
      } catch (e) {
        // redirect() van de server is geen fout
        if (!String((e as Error)?.message).includes("NEXT_REDIRECT")) setError((e as Error).message);
      }
    });
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wis-kop"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl"
      >
        <h2 id="wis-kop" className="text-lg font-semibold">Bon verwijderen?</h2>
        <p className="text-sm text-muted">
          <strong className="text-ink">{row.title}</strong> ({row.total}) wordt met foto en regels <strong className="text-ink">definitief</strong> verwijderd, ook uit het dashboard. Typ <strong className="text-ink">WISSEN</strong> om te bevestigen.
        </p>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="WISSEN"
          aria-label="Typ WISSEN om te bevestigen"
          autoCapitalize="characters"
          autoComplete="off"
          autoFocus
          className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-[17px] uppercase tracking-wider outline-none focus:border-danger"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="h-12 rounded-xl border border-line bg-surface text-[15px] font-medium">
            Annuleren
          </button>
          <button onClick={wipe} disabled={!ok || pending} className="h-12 rounded-xl bg-danger text-[15px] font-semibold text-white disabled:opacity-40">
            Definitief wissen
          </button>
        </div>
      </div>
    </div>
  );
}
