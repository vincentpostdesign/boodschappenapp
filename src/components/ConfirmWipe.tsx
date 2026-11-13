"use client";

import { useState, useTransition } from "react";

/** Bevestigingsvenster voor definitief verwijderen: pas na het typen van WISSEN werkt de knop. */
export function ConfirmWipe({
  title,
  children,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  onConfirm: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ok = text.trim().toUpperCase() === "WISSEN";
  const wipe = () =>
    start(async () => {
      try {
        await onConfirm();
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
        <h2 id="wis-kop" className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted">
          {children} Typ <strong className="text-ink">WISSEN</strong> om te bevestigen.
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
