"use client";

// Wachtrij voor wijzigingen aan de lijst als er (even) geen verbinding is, bijvoorbeeld in de winkel.
// Afvinken, aantallen, verwijderen en toevoegen worden in de telefoon bewaard en verstuurd zodra het weer kan.
// Het scherm toont ze meteen alsof ze al gelukt zijn.

import { useSyncExternalStore } from "react";
import { addFreeItem, removeItem, setChecked, setQuantity } from "@/app/actions";

export type Op =
  | { k: "check"; id: string; v: boolean }
  | { k: "qty"; id: string; v: number }
  | { k: "remove"; id: string }
  | { k: "add"; id: string; text: string };

const KEY = "boodschappen-wachtrij";
const TIMEOUT = 8000; // langer wachten op de server heeft in de winkel geen zin

let ops: Op[] = load();
const listeners = new Set<() => void>();

function load(): Op[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
function save(next: Op[]) {
  ops = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(ops));
  } catch {
    /* privémodus: alleen in het geheugen */
  }
  listeners.forEach((l) => l());
}

/** Voegt toe en vervangt een eerdere wijziging van dezelfde soort aan hetzelfde product (laatste telt). */
function enqueue(op: Op) {
  let next = ops.filter((o) => !(o.id === op.id && (o.k === op.k || op.k === "remove")));
  // Iets verwijderen dat alleen nog in de wachtrij stond: dan hoeft er niets naar de server.
  if (op.k === "remove" && ops.some((o) => o.k === "add" && o.id === op.id)) {
    next = next.filter((o) => o.id !== op.id);
    return save(next);
  }
  save([...next, op]);
}

function send(op: Op): Promise<unknown> {
  switch (op.k) {
    case "check":
      return setChecked(op.id, op.v);
    case "qty":
      return setQuantity(op.id, op.v);
    case "remove":
      return removeItem(op.id);
    case "add":
      return addFreeItem(op.text, undefined, op.id);
  }
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT))]);
}

/**
 * Probeert de wijziging direct te versturen; lukt dat niet (geen of traag netwerk),
 * dan blijft hij in de wachtrij en gaat hij later mee. Gooit nooit een fout naar het scherm.
 */
export async function runOrQueue(op: Op): Promise<void> {
  enqueue(op);
  if (ops.length > 1 || !navigator.onLine) return void flush(); // eerst de oudere wijzigingen
  try {
    await withTimeout(send(op));
    save(ops.filter((o) => o !== op && !(o.id === op.id && o.k === op.k && JSON.stringify(o) === JSON.stringify(op))));
  } catch {
    /* blijft staan; flush() probeert het later opnieuw */
  }
}

let flushing: Promise<boolean> | null = null;
/** Verstuurt de wachtrij op volgorde. Geeft true als alles verstuurd is. */
export function flush(): Promise<boolean> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      while (ops.length) {
        if (!navigator.onLine) return false;
        const op = ops[0];
        try {
          await withTimeout(send(op));
        } catch (e) {
          // Bestaat het product niet meer (door de ander verwijderd)? Dan deze wijziging laten vallen.
          if (!/timeout|fetch|network|load failed|internet/i.test(String((e as Error)?.message))) {
            save(ops.slice(1));
            continue;
          }
          return false;
        }
        save(ops.filter((o) => o !== op));
      }
      return true;
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && ((ops = load()), l());
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: Op[] = [];
/** De wijzigingen die nog niet bij de server zijn (voor het scherm). */
export function usePendingOps(): Op[] {
  return useSyncExternalStore(
    subscribe,
    () => ops,
    () => EMPTY,
  );
}

export function newId(): string {
  return crypto.randomUUID?.() ?? "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
}
