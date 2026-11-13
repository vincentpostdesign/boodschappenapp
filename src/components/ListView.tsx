"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { newId, runOrQueue, usePendingOps } from "@/lib/offline-queue";
import { PersonDot } from "./PersonDot";
import { IconCheck, IconPlus, IconTag, IconTrash } from "./icons";
import { Stepper } from "./Stepper";
import { SwipeToDelete } from "./SwipeToDelete";
import type { PersonId } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { setItemCategory } from "@/app/actions";

export type ViewItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  addedBy: PersonId;
  addedOn: string;
  checked: boolean;
  cheaper: { storeName: string; difference: number } | null;
  waiting?: boolean; // offline toegevoegd, nog niet bij de server
  category?: string | null; // soort product (bepaalt de afdeling als er geen vaste koppeling is)
  movable?: boolean; // afdeling volgt uit de soort, dus met de hand te verplaatsen
  scoupy?: { label: string; product: string; stores: string; until: string } | null; // cashback-actie in Scoupy
};

type Group = { key: string; name: string; items: ViewItem[] };

const euroDiff = (n: number) => `−€${n.toFixed(2).replace(".", ",")}`;

export function ListView({
  groups,
  done,
  suggestions,
  storeName,
  me,
}: {
  groups: Group[];
  done: ViewItem[];
  suggestions: string[];
  storeName: string;
  me: PersonId;
}) {
  const [, start] = useTransition();
  // Wijzigingen die (door slechte verbinding) nog in de telefoon wachten, tonen we alsof ze gelukt zijn.
  const pending = usePendingOps();
  const pendingCheck = new Map(pending.flatMap((o) => (o.k === "check" ? [[o.id, o.v] as const] : [])));
  const pendingQty = new Map(pending.flatMap((o) => (o.k === "qty" ? [[o.id, o.v] as const] : [])));
  const pendingRemoved = new Set(pending.flatMap((o) => (o.k === "remove" ? [o.id] : [])));
  const known = new Set([...groups.flatMap((g) => g.items), ...done].map((i) => i.id));
  const pendingAdds: ViewItem[] = pending.flatMap((o) =>
    o.k === "add" && !known.has(o.id)
      ? [{ id: o.id, name: o.text.charAt(0).toUpperCase() + o.text.slice(1), description: null, quantity: 1, addedBy: me, addedOn: "net", checked: false, cheaper: null, waiting: true }]
      : [],
  );
  if (pendingAdds.length) groups = [...groups, { key: "wachtend", name: "Net toegevoegd", items: pendingAdds }];
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
      await runOrQueue({ k: "remove", id: item.id });
    });
  const swipeProps = (item: ViewItem) => ({
    swipeOpen: swipeOpen === item.id,
    onSwipeOpen: (o: boolean) => setSwipeOpen(o ? item.id : null),
    onRemove: () => onRemove(item),
  });

  const visible = (items: ViewItem[]) =>
    items.filter((i) => !removed.has(i.id) && !pendingRemoved.has(i.id)).map((i) => (pendingQty.has(i.id) ? { ...i, quantity: pendingQty.get(i.id)! } : i));
  groups = groups.map((g) => ({ ...g, items: visible(g.items) }));
  done = visible(done);
  const all = [...groups.flatMap((g) => g.items), ...done];
  const isChecked = (i: ViewItem) => toggled.get(i.id) ?? pendingCheck.get(i.id) ?? i.checked;
  const openGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !isChecked(i)) }))
    .filter((g) => g.items.length);
  const doneItems = all.filter(isChecked);
  const openCount = all.length - doneItems.length;

  const onToggle = (item: ViewItem) =>
    start(async () => {
      const next = !isChecked(item);
      toggle([item.id, next]);
      await runOrQueue({ k: "check", id: item.id, v: next });
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
      await runOrQueue({ k: "qty", id: item.id, v: n });
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
              {item.waiting ? "wordt verstuurd zodra er verbinding is" : item.addedOn}
            </span>
            {item.cheaper && !checked && (
              <span className="inline-flex items-center gap-1 rounded-md bg-deal-soft px-1.5 py-0.5 text-xs font-semibold text-deal">
                <IconTag className="h-3.5 w-3.5" />
                {item.cheaper.storeName} {euroDiff(item.cheaper.difference)}
              </span>
            )}
            {item.scoupy && !checked && (
              <span
                title={`Scoupy: ${item.scoupy.product}${item.scoupy.stores ? ` (${item.scoupy.stores})` : ""} t/m ${item.scoupy.until}`}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-[#fde8ec] px-1.5 py-0.5 text-xs font-semibold text-[#b0213e]"
              >
                <span className="truncate">
                  Scoupy {item.scoupy.label}
                  {item.scoupy.stores ? ` · ${item.scoupy.stores}` : ""} · t/m {item.scoupy.until}
                </span>
              </span>
            )}
          </span>
        </button>
        {!checked && <Stepper value={qty} label={item.name} onChange={changeQty} />}
      </div>
      </SwipeToDelete>
      {expanded && (
        <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/60 px-3 py-2">
          {item.movable && !item.waiting && (
            <label className="mr-auto flex min-w-0 items-center gap-2 text-sm text-muted">
              <span className="shrink-0">Afdeling</span>
              <select
                defaultValue={item.category ?? "overig"}
                onChange={(e) => start(() => setItemCategory(item.id, e.target.value))}
                className="h-11 min-w-0 rounded-xl border border-line bg-surface px-2 text-[15px] text-ink"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
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
  const pending = false; // toevoegen wacht nooit: het gaat direct of via de wachtrij
  const input = useRef<HTMLInputElement>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    input.current?.focus();
    void runOrQueue({ k: "add", id: newId(), text: value });
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
