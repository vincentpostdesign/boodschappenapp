"use client";

import { useEffect, useState } from "react";

/** Blijft het laadscherm te lang staan (bijv. na terugkomen uit de fotokiezer op iPhone), dan een knop om opnieuw te laden. */
export function SlowLoading({ after = 6000 }: { after?: number }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), after);
    return () => clearTimeout(t);
  }, [after]);
  if (!slow) return null;
  return (
    <div role="status" className="fixed inset-x-4 top-1/3 z-30 mx-auto max-w-sm space-y-3 rounded-2xl border border-line bg-surface p-5 text-center shadow-lg">
      <p className="font-semibold">Het laden duurt lang</p>
      <p className="text-sm text-muted">Controleer je verbinding en probeer het opnieuw.</p>
      <button onClick={() => window.location.reload()} className="h-12 w-full rounded-xl bg-accent font-semibold text-accent-ink">
        Opnieuw laden
      </button>
    </div>
  );
}
