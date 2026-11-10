"use client";

import { useState } from "react";
import { refreshAllData } from "@/app/beheer-actions";

/**
 * "App verversen": bewaarde gegevens op de server opnieuw ophalen, de app-cache op de telefoon leegmaken,
 * de nieuwste versie van de service worker activeren en herladen. Handig in de app op het beginscherm.
 */
export function RefreshApp() {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await refreshAllData();
      if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k);
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
        reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
      }
    } finally {
      window.location.reload();
    }
  };
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-surface px-3 text-sm font-semibold disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
      </svg>
      {busy ? "Verversen…" : "App verversen"}
    </button>
  );
}
