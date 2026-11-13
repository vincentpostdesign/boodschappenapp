"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { newId, runOrQueue, usePendingOps } from "@/lib/offline-queue";
import { PersonDot } from "./PersonDot";
import { IconCheck, IconPlus, IconTag } from "./icons";
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
  // Cashback-actie in Scoupy; here = geldt bij de gekozen winkel
  scoupy?: { label: string; product: string; stores: string; here: boolean; storeName: string; until: string } | null;
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

  const pendingEdit = new Map(pending.flatMap((o) => (o.k === "edit" ? [[o.id, o] as const] : [])));
  const visible = (items: ViewItem[]) =>
    items
      .filter((i) => !removed.has(i.id) && !pendingRemoved.has(i.id))
      .map((i) => (pendingQty.has(i.id) ? { ...i, quantity: pendingQty.get(i.id)! } : i))
      .map((i) => {
        const e = pendingEdit.get(i.id);
        return e ? { ...i, name: e.name, description: e.note || null } : i;
      });
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
                title={`Scoupy: ${item.scoupy.product} · geldt bij ${item.scoupy.stores} · t/m ${item.scoupy.until}`}
                className={`inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                  item.scoupy.here ? "bg-[#fde8ec] text-[#b0213e]" : "bg-surface-2 text-muted"
                }`}
              >
                <span className="truncate">
                  Scoupy {item.scoupy.label} ·{" "}
                  {item.scoupy.here ? `geldt bij ${item.scoupy.storeName}` :`niet bij ${item.scoupy.storeName}, wel bij ${item.scoupy.stores}`} · t/m {item.scoupy.until}
                </span>
              </span>
            )}
          </span>
        </button>
        {!checked && <Stepper value={qty} label={item.name} onChange={changeQty} />}
      </div>
      </SwipeToDelete>
      {expanded && <EditPanel item={item} onClose={onExpand} />}
    </li>
  );
}

/** Tik op een product: naam, opmerking en afdeling wijzigen. Verwijderen gaat alleen door te vegen. */
function EditPanel({ item, onClose }: { item: ViewItem; onClose: () => void }) {
  const [name, setName] = useState(item.name);
  const [note, setNote] = useState(item.description ?? "");
  const [category, setCategory] = useState(item.category ?? "overig");
  const [, start] = useTransition();
  const field = "h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-[16px] outline-none focus:border-accent";

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    onClose();
    if (n !== item.name || note.trim() !== (item.description ?? "")) {
      void runOrQueue({ k: "edit", id: item.id, name: n, note: note.trim() });
    }
    if (item.movable && category !== (item.category ?? "overig")) start(() => setItemCategory(item.id, category));
  };

  return (
    <form onSubmit={save} className="space-y-2 border-t border-line bg-surface-2/60 px-3 py-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 [&>*]:min-w-0">
        <label className="block">
          <span className="mb-1 block px-1 text-xs font-medium text-muted">Naam</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoComplete="off" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block px-1 text-xs font-medium text-muted">Opmerking</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={160}
            placeholder="Bijv. merk, smaak, grootte"
            autoComplete="off"
            className={field}
          />
        </label>
      </div>
      {item.movable && !item.waiting && (
        <label className="block">
          <span className="mb-1 block px-1 text-xs font-medium text-muted">Afdeling</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-line bg-surface text-[15px] font-medium">
          Annuleren
        </button>
        <button disabled={!name.trim()} className="h-11 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-50">
          Opslaan
        </button>
      </div>
    </form>
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
