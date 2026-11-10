"use client";

import { useEffect } from "react";

// Na een nieuwe versie van de app kan een open scherm nog naar oude bestanden verwijzen.
// Dat herstellen we met één automatische herlaadbeurt; anders een nette foutmelding met knop.
const STALE = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Failed to find Server Action|older or newer deployment/i;

export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = STALE.test(`${error?.name} ${error?.message}`);

  useEffect(() => {
    if (!stale) return;
    try {
      const key = "boodschappen-herladen";
      const last = Number(sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  }, [stale]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 py-10">
      <p className="text-sm font-medium text-accent">Boodschappen</p>
      <h1 className="text-2xl font-semibold tracking-tight">{stale ? "Nieuwe versie wordt geladen…" : "Er ging iets mis"}</h1>
      <p className="text-muted">
        {stale ? "De app is net bijgewerkt. Even geduld." : "Probeer het opnieuw. Blijft dit gebeuren, laad de app dan opnieuw."}
      </p>
      <div className="flex gap-2">
        <button onClick={() => reset()} className="h-12 flex-1 rounded-2xl border border-line bg-surface font-semibold">
          Opnieuw proberen
        </button>
        <button onClick={() => window.location.assign("/")} className="h-12 flex-1 rounded-2xl bg-accent font-semibold text-accent-ink">
          App herladen
        </button>
      </div>
    </main>
  );
}
