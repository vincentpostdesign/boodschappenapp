"use client";

import { useEffect, useState, useTransition } from "react";
import { addDepartment, copyRoute, deleteDepartment, renameDepartment, reorderDepartments } from "@/app/beheer-actions";
import { IconDown, IconPlus, IconTrash, IconUp } from "../icons";

type Dep = { id: string; name: string; products: number };

export function RouteEditor({
  storeId,
  storeName,
  departments,
  copyFrom,
}: {
  storeId: string;
  storeName: string;
  departments: Dep[];
  copyFrom: { id: string; name: string } | null;
}) {
  const [order, setOrder] = useState(departments);
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => setOrder(departments), [departments]);

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Er ging iets mis");
        setOrder(departments);
      }
    });

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[index], next[to]] = [next[to], next[index]];
    setOrder(next);
    run(() => reorderDepartments(storeId, next.map((d) => d.id)));
  };

  return (
    <div className="space-y-4" aria-busy={pending}>
      <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {order.map((d, i) => (
          <li key={d.id} className="flex items-center gap-2 py-1.5 pl-3 pr-1.5">
            <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted">{i + 1}</span>
            {editing === d.id ? (
              <form
                className="flex min-w-0 flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = String(new FormData(e.currentTarget).get("name") ?? "");
                  setEditing(null);
                  run(() => renameDepartment(d.id, name));
                }}
              >
                <input
                  name="name"
                  defaultValue={d.name}
                  autoFocus
                  aria-label="Nieuwe naam"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-accent bg-surface px-3 outline-none"
                />
                <button className="h-11 rounded-xl bg-accent px-3 text-sm font-semibold text-accent-ink">OK</button>
              </form>
            ) : (
              <button onClick={() => setEditing(d.id)} className="min-w-0 flex-1 py-2 text-left" title="Tik om te hernoemen">
                <span className="block font-medium leading-tight">{d.name}</span>
                <span className="block text-xs text-muted">{d.products === 1 ? "1 vast product" : `${d.products} vaste producten`}</span>
              </button>
            )}
            <button
              aria-label={`${d.name} omhoog`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink disabled:opacity-25"
            >
              <IconUp className="h-6 w-6" />
            </button>
            <button
              aria-label={`${d.name} omlaag`}
              disabled={i === order.length - 1}
              onClick={() => move(i, 1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink disabled:opacity-25"
            >
              <IconDown className="h-6 w-6" />
            </button>
            <button
              aria-label={`${d.name} verwijderen`}
              onClick={() => {
                const msg = d.products
                  ? `"${d.name}" verwijderen? ${d.products} vaste producten komen dan bij de ${storeName} onder Overig.`
                  : `"${d.name}" verwijderen?`;
                if (confirm(msg)) run(() => deleteDepartment(d.id));
              }}
              className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl text-muted"
            >
              <IconTrash className="h-5 w-5" />
            </button>
          </li>
        ))}
      </ol>

      {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = newName;
          setNewName("");
          run(() => addDepartment(storeId, name));
        }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nieuwe afdeling…"
          aria-label="Nieuwe afdeling"
          className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 outline-none focus:border-accent"
        />
        <button
          disabled={!newName.trim()}
          aria-label="Afdeling toevoegen"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink disabled:opacity-50"
        >
          <IconPlus className="h-6 w-6" />
        </button>
      </form>

      {copyFrom && (
        <button
          onClick={() => {
            if (confirm(`De volgorde van de ${copyFrom.name} overnemen voor de ${storeName}? Ontbrekende afdelingen worden toegevoegd.`))
              run(() => copyRoute(copyFrom.id, storeId));
          }}
          className="h-12 w-full rounded-2xl border border-line bg-surface text-[15px] font-medium"
        >
          Volgorde van de {copyFrom.name} overnemen
        </button>
      )}
    </div>
  );
}
