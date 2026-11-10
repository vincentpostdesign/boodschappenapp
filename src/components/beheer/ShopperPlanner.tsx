"use client";

import { useOptimistic, useTransition } from "react";
import { setWeekdayShopper } from "@/app/beheer-actions";
import { WEEKDAYS } from "@/lib/schedule";
import type { PersonId } from "@/lib/types";

const OPTIONS = [
  { id: "vincent", label: "Vincent", on: "bg-vincent text-white border-vincent" },
  { id: "marleen", label: "Marleen", on: "bg-marleen text-white border-marleen" },
] as const;

/** Vast weekrooster: per weekdag wie de boodschappen doet. Geldt elke week; vandaag is gemarkeerd. */
export function ShopperPlanner({ schedule, todayIndex, todayLabel }: { schedule: (PersonId | null)[]; todayIndex: number; todayLabel: string }) {
  const [, start] = useTransition();
  const [state, set] = useOptimistic(schedule, (s, [i, v]: [number, PersonId | null]) => s.map((x, j) => (j === i ? v : x)));

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {WEEKDAYS.map((name, i) => {
        const isToday = i === todayIndex;
        return (
          <li key={name} className={`flex items-center gap-3 px-4 py-2.5 ${isToday ? "bg-accent-soft" : ""}`} aria-current={isToday ? "date" : undefined}>
            <span className="min-w-0 flex-1">
              <span className={`block ${isToday ? "font-semibold text-accent" : ""}`}>{name}</span>
              {isToday && <span className="block text-xs font-medium text-accent">Vandaag · {todayLabel}</span>}
            </span>
            <div role="radiogroup" aria-label={`Boodschapper op ${name.toLowerCase()}`} className="flex gap-1.5">
              {OPTIONS.map((o) => {
                const on = state[i] === o.id;
                return (
                  <button
                    key={o.id}
                    role="radio"
                    aria-checked={on}
                    onClick={() =>
                      start(async () => {
                        const v = on ? null : o.id;
                        set([i, v]);
                        await setWeekdayShopper(i, v);
                      })
                    }
                    className={`h-11 whitespace-nowrap rounded-xl border px-3.5 text-sm font-semibold ${on ? o.on : "border-line bg-surface text-muted"}`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
