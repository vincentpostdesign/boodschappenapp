"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { addFreeItem, removeItem, setChecked, setQuantity } from "@/app/actions";
import { PersonDot } from "./PersonDot";
import { IconCheck, IconPlus, IconTag, IconTrash } from "./icons";
import { Stepper } from "./Stepper";
import { SwipeToDelete } from "./SwipeToDelete";
import type { PersonId } from "@/lib/types";

export type ViewItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  addedBy: PersonId;
  addedOn: string;
  checked: boolean;
  cheaper: { storeName: string; difference: number } | null;
};

type Group = { key: string; name: string; items: ViewItem[] };

const euroDiff = (n: number) => `−€${n.toFixed(2).replace(".", ",")}`;

export function ListView({
  groups,
  done,
  suggestions,
  storeName,
}: {
  groups: Group[];
  done: ViewItem[];
  suggestions: string[];
  storeName: string;
}) {
  const [, start] = useTransition();
  // Optimistisch afvinken: direct zichtbaar, server volgt.
  const [toggled, toggle] = useOptimistic(new Map<string, boolean>(), (m, [id, v]: [string, boolean]) => new Map(m).set(id, v));
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [swipeOpen, setSwipeOpen] = useState<string | null>(null);
  // Optimistisch verwijderen: regel verdwijnt direct, server volgt.
  const [removed, markRemoved] = useOptimistic(new Set<string>(), (s, id: string) => new Set(s).add(id));

  const onRemove = (item: ViewItem) =>
    start(async () => {
      markRemoved(item.id);
      setSwipeOpen(null);
      await removeItem(item.id);
    });
  const swipeProps = (item: ViewItem) => ({
    swipeOpen: swipeOpen === item.id,
    onSwipeOpen: (o: boolean) => setSwipeOpen(o ? item.id : null),
    onRemove: () => onRemove(item),
  });

  const visible = (items: ViewItem[]) => items.filter((i) => !removed.has(i.id));
  groups = groups.map((g) => ({ ...g, items: visible(g.items) }));
  done = visible(done);
  const all = [...groups.flatMap((g) => g.items), ...done];
  const isChecked = (i: ViewItem) => toggled.get(i.id) ?? i.checked;
  const openGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !isChecked(i)) }))
    .filter((g) => g.items.length);
  const doneItems = all.filter(isChecked);
  const openCount = all.length - doneItems.length;

  const onToggle = (item: ViewItem) =>
    start(async () => {
      const next = !isChecked(item);
      toggle([item.id, next]);
      await setChecked(item.id, next);
    });

  return (
    <div className="space-y-6">
      <AddBar suggestions={suggestions} />

      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h1 className="text-2xl font-semibold tracking-tight">Boodschappenlijst</h1>
        <span className="text-sm text-muted">
          {openCount === 0 ? "Alles gehaald" : `${openCount} te halen`} · route {storeName}
        </span>
      </div>

      {openGroups.length === 0 && (
        <p className="rounded-2xl bg-surface px-4 py-8 text-center text-muted">
          De lijst is leeg. Typ hierboven iets of kies uit de <a href="/vast" className="font-medium text-accent">vaste producten</a>.
        </p>
      )}

      {openGroups.map((g) => (
        <section key={g.key} aria-label={g.name}>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">{g.name}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {g.items.map((item) => (
              <Row
                key={item.id}
                item={item}
                checked={false}
                expanded={openItem === item.id}
                onExpand={() => setOpenItem(openItem === item.id ? null : item.id)}
                onToggle={() => onToggle(item)}
                {...swipeProps(item)}
              />
            ))}
          </ul>
        </section>
      ))}

      {doneItems.length > 0 && (
        <section aria-label="Gehaald">
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">Gehaald · {doneItems.length}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/60">
            {doneItems.map((item) => (
              <Row key={item.id} item={item} checked expanded={false} onExpand={() => {}} onToggle={() => onToggle(item)} {...swipeProps(item)} />
            ))}
          </ul>
          <p className="mt-2 px-1 text-xs text-muted">Gehaalde producten verdwijnen vannacht van de lijst.</p>
        </section>
      )}
    </div>
  );
}

function Row({
  item,
  checked,
  expanded,
  onExpand,
  onToggle,
  swipeOpen,
  onSwipeOpen,
  onRemove,
}: {
  item: ViewItem;
  checked: boolean;
  expanded: boolean;
  onExpand: () => void;
  onToggle: () => void;
  swipeOpen: boolean;
  onSwipeOpen: (open: boolean) => void;
  onRemove: () => void;
}) {
  const [, start] = useTransition();
  const [qty, setQty] = useOptimistic(item.quantity);
  const changeQty = (n: number) =>
    start(async () => {
      setQty(n);
      await setQuantity(item.id, n);
    });
  return (
    <li>
      <SwipeToDelete open={swipeOpen} onOpenChange={onSwipeOpen} onDelete={onRemove} label={item.name}>
      <div className="flex min-h-16 items-center gap-2 pl-2 pr-2">
        <button
          onClick={onToggle}
          aria-label={checked ? `${item.name} terugzetten` : `${item.name} afvinken`}
          className="flex h-14 w-12 shrink-0 items-center justify-center"
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 ${
              checked ? "border-accent bg-accent text-accent-ink" : "border-muted/60"
            }`}
          >
            {checked && <IconCheck className="h-5 w-5" />}
          </span>
        </button>
        <button onClick={onExpand} disabled={checked} className="min-w-0 flex-1 py-2 text-left" aria-expanded={expanded}>
          <span className={`block text-[17px] font-medium leading-tight ${checked ? "text-muted line-through" : ""}`}>
            {checked && qty > 1 && <span className="mr-1.5 font-semibold">{qty}×</span>}
            {item.name}
          </span>
          {item.description && <span className="block truncate text-sm text-muted">{item.description}</span>}
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <PersonDot person={item.addedBy} />
              {item.addedOn}
            </span>
            {item.cheaper && !checked && (
              <span className="inline-flex items-center gap-1 rounded-md bg-deal-soft px-1.5 py-0.5 text-xs font-semibold text-deal">
                <IconTag className="h-3.5 w-3.5" />
                {item.cheaper.storeName} {euroDiff(item.cheaper.difference)}
              </span>
            )}
          </span>
        </button>
        {!checked && <Stepper value={qty} label={item.name} onChange={changeQty} />}
      </div>
      </SwipeToDelete>
      {expanded && (
        <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/60 px-3 py-2">
          <button
            onClick={onRemove}
            className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-danger"
          >
            <IconTrash className="h-5 w-5" /> Van de lijst halen
          </button>
        </div>
      )}
    </li>
  );
}

function AddBar({ suggestions }: { suggestions: string[] }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    start(async () => {
      await addFreeItem(value);
      input.current?.focus();
    });
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        ref={input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        list="vaste-producten"
        placeholder="Product toevoegen…"
        aria-label="Product toevoegen"
        enterKeyHint="done"
        autoComplete="off"
        className="h-14 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 text-[17px] outline-none placeholder:text-muted focus:border-accent"
      />
      <datalist id="vaste-producten">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <button
        disabled={pending || !text.trim()}
        aria-label="Toevoegen"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink disabled:opacity-50"
      >
        <IconPlus className="h-7 w-7" />
      </button>
    </form>
  );
}
