"use client";

import { useEffect } from "react";

/** Registreert de service worker (meldingen en offline) en wist het rode bolletje op het app-icoon bij openen. */
export function ServiceWorker() {
  useEffect(() => {
    // Alleen in de echte versie: tijdens het ontwikkelen veranderen bestanden zonder nieuwe naam.
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
    const clear = () => {
      if (document.visibilityState === "visible" && "clearAppBadge" in navigator) {
        (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge().catch(() => {});
      }
    };
    clear();
    document.addEventListener("visibilitychange", clear);
    return () => document.removeEventListener("visibilitychange", clear);
  }, []);
  return null;
}
