"use client";

import { IconMinus, IconPlus } from "./icons";

/** Aantal direct aanpassen: − aantal +. Grote tikdoelen, het getal blijft altijd zichtbaar. */
export function Stepper({
  value,
  onChange,
  min = 1,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  label: string;
}) {
  return (
    <div role="group" aria-label={`Aantal ${label}`} className="flex shrink-0 items-center rounded-full border border-line bg-surface">
      <button
        type="button"
        aria-label={value <= 1 && min === 0 ? `${label} van de lijst halen` : `Minder ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-ink disabled:opacity-30"
      >
        <IconMinus className="h-5 w-5" />
      </button>
      <span aria-live="polite" className="w-6 text-center text-[17px] font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Meer ${label}`}
        disabled={value >= 99}
        onClick={() => onChange(value + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-accent disabled:opacity-30"
      >
        <IconPlus className="h-5 w-5" />
      </button>
    </div>
  );
}
