"use client";

import { useEffect, useState } from "react";
import { flush, usePendingOps } from "@/lib/offline-queue";

/** Klein label bovenin: geen verbinding, en/of hoeveel wijzigingen nog verstuurd moeten worden. */
export function OfflineStatus() {
  const pending = usePendingOps();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online && pending.length === 0) return null;
  const n = pending.length;
  const waiting = n ? `${n} ${n === 1 ? "wijziging wacht" : "wijzigingen wachten"} op verbinding` : "";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.25rem)] z-50 flex justify-center px-4">
      <button
        onClick={() => flush()}
        className="pointer-events-auto rounded-full bg-ink/85 px-4 py-1.5 text-[13px] font-medium text-white shadow-lg"
      >
        {online ? waiting : `Geen verbinding${n ? ` · ${waiting}` : " · de lijst werkt gewoon"}`}
      </button>
    </div>
  );
}
