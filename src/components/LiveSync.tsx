"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { flush } from "@/lib/offline-queue";

const INTERVAL = 3000;
const TIMEOUT = 5000;

/** Vraagt de service worker de lijst opnieuw te bewaren, zodat die offline actueel is. */
function keepOffline(path = "/") {
  navigator.serviceWorker?.controller?.postMessage({ type: "BEWAAR", path });
}

/**
 * Houdt de app actueel: vraagt elke paar seconden (alleen als de app zichtbaar is) het versienummer op.
 * Is het veranderd, bijvoorbeeld doordat Marleen iets toevoegde, dan worden de gegevens ververst
 * en bewaart de telefoon de nieuwe lijst voor als er straks geen bereik is.
 * Bij terugkomen in de app of terugkeer van de verbinding wordt eerst de wachtrij verstuurd.
 * Bij slechte verbinding wordt nooit eindeloos gewacht.
 */
export function LiveSync() {
  const router = useRouter();
  const known = useRef<number | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    const saveSoon = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => keepOffline("/"), 1500);
    };

    const check = async () => {
      if (busy.current || document.visibilityState !== "visible" || !navigator.onLine) return;
      busy.current = true;
      try {
        await flush(); // eerst wat offline is afgevinkt of toegevoegd
        const res = await fetch("/api/versie", { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
        if (res.ok) {
          const { v } = (await res.json()) as { v: number };
          if (known.current !== null && v !== known.current) {
            router.refresh();
            saveSoon();
          }
          known.current = v;
        }
      } catch {
        /* geen of trage verbinding: volgende keer opnieuw */
      } finally {
        busy.current = false;
      }
    };

    const loop = async () => {
      await check();
      timer = setTimeout(loop, INTERVAL);
    };
    loop();
    saveSoon();

    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", check);
    return () => {
      clearTimeout(timer);
      clearTimeout(saveTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", check);
    };
  }, [router]);

  return null;
}
