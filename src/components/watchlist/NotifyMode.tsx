"use client";

import { useOptimistic, useTransition } from "react";
import { setWatchNotify } from "@/app/watchlist-actions";

const OPTIONS = [
  { id: "direct", label: "Direct", sub: "Zodra er een goede aanbieding is" },
  { id: "wekelijks", label: "Wekelijks", sub: "Gebundeld op maandag" },
] as const;

export function NotifyMode({ mode }: { mode: "direct" | "wekelijks" }) {
  const [, start] = useTransition();
  const [current, set] = useOptimistic(mode);
  return (
    <div role="radiogroup" aria-label="Meldingen" className="grid grid-cols-2 gap-2">
      {OPTIONS.map((o) => {
        const on = current === o.id;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={on}
            onClick={() =>
              start(async () => {
                set(o.id);
                await setWatchNotify(o.id);
              })
            }
            className={`rounded-2xl border px-4 py-3 text-left ${on ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}
          >
            <span className={`block font-semibold ${on ? "text-accent" : ""}`}>{o.label}</span>
            <span className="block text-xs text-muted">{o.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
