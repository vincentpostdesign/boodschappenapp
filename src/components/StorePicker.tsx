"use client";

import { useOptimistic, useTransition } from "react";
import { chooseStore } from "@/app/actions";

export function StorePicker({ stores, activeId }: { stores: { id: string; name: string }[]; activeId: string }) {
  const [pending, start] = useTransition();
  const [active, setActive] = useOptimistic(activeId);
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]" aria-busy={pending}>
      <div role="radiogroup" aria-label="Winkel" className="flex gap-2">
        {stores.map((s) => {
          const on = s.id === active;
          return (
            <button
              key={s.id}
              role="radio"
              aria-checked={on}
              onClick={() =>
                start(async () => {
                  setActive(s.id);
                  await chooseStore(s.id);
                })
              }
              className={`h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${
                on ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink"
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
