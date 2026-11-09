"use client";

import { useState, useTransition } from "react";
import { makeFixedProduct } from "@/app/beheer-actions";

export function MakeFixedButton({ name }: { name: string }) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button
      disabled={done || pending}
      onClick={() =>
        start(async () => {
          await makeFixedProduct(name);
          setDone(true);
        })
      }
      className={`h-10 shrink-0 whitespace-nowrap rounded-xl px-3 text-sm font-semibold ${done ? "bg-accent-soft text-accent" : "bg-accent text-accent-ink"}`}
    >
      {done ? "Vast product" : "Maak vast"}
    </button>
  );
}
