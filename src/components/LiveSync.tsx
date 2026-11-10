"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const INTERVAL = 3000;

/**
 * Houdt de app actueel: vraagt elke paar seconden (alleen als de app zichtbaar is) het versienummer op.
 * Is het veranderd, bijvoorbeeld doordat Marleen iets toevoegde, dan worden de gegevens ververst.
 * Bij terugkomen in de app wordt meteen gekeken.
 */
export function LiveSync() {
  const router = useRouter();
  const known = useRef<number | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      if (busy.current || document.visibilityState !== "visible") return;
      busy.current = true;
      try {
        const res = await fetch("/api/versie", { cache: "no-store" });
        if (res.ok) {
          const { v } = (await res.json()) as { v: number };
          if (known.current !== null && v !== known.current) router.refresh();
          known.current = v;
        }
      } catch {
        /* geen verbinding: volgende keer opnieuw */
      } finally {
        busy.current = false;
      }
    };

    const loop = async () => {
      await check();
      timer = setTimeout(loop, INTERVAL);
    };
    loop();

    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router]);

  return null;
}
