"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteReceipt } from "@/app/bon-actions";
import { SwipeToDelete } from "../SwipeToDelete";
import { ConfirmWipe } from "../ConfirmWipe";

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
          title="Bon verwijderen?"
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const r = confirm;
            setGone((s) => new Set(s).add(r.id));
            setConfirm(null);
            await deleteReceipt(r.id, "WISSEN");
          }}
        >
          <strong className="text-ink">{confirm.title}</strong> ({confirm.total}) wordt met foto en regels <strong className="text-ink">definitief</strong> verwijderd, ook uit het dashboard.
        </ConfirmWipe>
      )}
    </>
  );
}
