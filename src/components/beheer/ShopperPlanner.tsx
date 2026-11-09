"use client";

import { useOptimistic, useTransition } from "react";
import { setShopper } from "@/app/beheer-actions";

const OPTIONS = [
  { id: "vincent", label: "Vincent", on: "bg-vincent text-white border-vincent" },
  { id: "marleen", label: "Marleen", on: "bg-marleen text-white border-marleen" },
] as const;

function dayLabel(day: string, index: number) {
  if (index === 0) return "Vandaag";
  if (index === 1) return "Morgen";
  const s = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/\./g, "");
}

export function ShopperPlanner({ days, plan }: { days: string[]; plan: Record<string, string> }) {
  const [, start] = useTransition();
  const [state, set] = useOptimistic(plan, (p, [d, v]: [string, string | null]) => {
    const next = { ...p };
    if (v) next[d] = v;
    else delete next[d];
    return next;
  });

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {days.map((d, i) => (
        <li key={d} className="flex items-center gap-3 px-4 py-2.5">
          <span className={`min-w-0 flex-1 ${i === 0 ? "font-semibold" : ""}`}>{dayLabel(d, i)}</span>
          <div role="radiogroup" aria-label={`Boodschapper ${dayLabel(d, i)}`} className="flex gap-1.5">
            {OPTIONS.map((o) => {
              const on = state[d] === o.id;
              return (
                <button
                  key={o.id}
                  role="radio"
                  aria-checked={on}
                  onClick={() =>
                    start(async () => {
                      const v = on ? null : o.id;
                      set([d, v]);
                      await setShopper(d, v);
                    })
                  }
                  className={`h-11 whitespace-nowrap rounded-xl border px-3.5 text-sm font-semibold ${on ? o.on : "border-line text-muted"}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}
