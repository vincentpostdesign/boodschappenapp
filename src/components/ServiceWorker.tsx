"use client";

import { useEffect } from "react";

/** Registreert de service worker (meldingen en offline). */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
