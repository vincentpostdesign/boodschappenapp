"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { clearBoughtGifts, deleteGift, saveGift, setGiftBought, type GiftState } from "@/app/cadeau-actions";
import { OCCASIONS, euro, type Gift, type OccasionId } from "@/lib/gifts";
import type { PersonId } from "@/lib/types";
import { PersonDot } from "../PersonDot";
import { SwipeToDelete } from "../SwipeToDelete";
import { IconCheck, IconPlus } from "../icons";

const input =
  "h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-[16px] outline-none placeholder:text-muted focus:border-accent";

export function GiftList({ gifts, me, initial }: { gifts: Gift[]; me: PersonId; initial: OccasionId }) {
  const [occasion, setOccasion] = useState<OccasionId>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [swipeOpen, setSwipeOpen] = useState<string | null>(null);
  const [, start] = useTransition();
  const [bought, markBought] = useOptimistic(new Map<string, boolean>(), (m, [id, v]: [string, boolean]) => new Map(m).set(id, v));
  const [removed, markRemoved] = useOptimistic(new Set<string>(), (s, id: string) => new Set(s).add(id));

  const pick = (o: OccasionId) => {
    setOccasion(o);
    setOpenId(null);
    try {
      history.replaceState(null, "", `?g=${o}`);
    } catch {}
  };

  const live = gifts.filter((g) => !removed.has(g.id)).map((g) => ({ ...g, bought: bought.get(g.id) ?? g.bought }));
  const here = live.filter((g) => g.occasion === occasion);
  const recipients = [...new Set(live.map((g) => g.recipient).filter((r): r is string => !!r))].sort((a, b) => a.localeCompare(b, "nl"));

  // Per persoon voor wie het is; zonder naam onderaan.
  const groups = new Map<string, Gift[]>();
  for (const g of [...here].sort((a, b) => Number(a.bought) - Number(b.bought) || a.name.localeCompare(b.name, "nl"))) {
    const k = g.recipient ?? "";
    groups.set(k, [...(groups.get(k) ?? []), g]);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "nl")));

  const total = here.reduce((s, g) => s + (g.price ?? 0), 0);
  const spent = here.filter((g) => g.bought).reduce((s, g) => s + (g.price ?? 0), 0);
  const boughtCount = here.filter((g) => g.bought).length;

  const toggle = (g: Gift) =>
    start(async () => {
      markBought([g.id, !g.bought]);
      await setGiftBought(g.id, !g.bought);
    });
  const remove = (g: Gift) =>
    start(async () => {
      markRemoved(g.id);
      setSwipeOpen(null);
      setOpenId(null);
      await deleteGift(g.id);
    });

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Gelegenheid" className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1">
        {OCCASIONS.map((o) => {
          const n = live.filter((g) => g.occasion === o.id && !g.bought).length;
          const active = o.id === occasion;
          return (
            <button
              key={o.id}
              role="tab"
              aria-selected={active}
              onClick={() => pick(o.id)}
              className={`flex h-11 min-w-0 items-center justify-center gap-1 rounded-xl px-1 text-[14px] font-medium ${
                active ? "bg-surface text-ink shadow-sm" : "text-muted"
              }`}
            >
              <span className="truncate">{o.short}</span>
              {n > 0 && <span className={`text-xs tabular-nums ${active ? "text-accent" : ""}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      <QuickAdd occasion={occasion} recipients={recipients} />

      {here.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-muted">
          Nog niets voor {OCCASIONS.find((o) => o.id === occasion)!.name.toLowerCase()}. Zet hierboven een idee neer.
        </p>
      ) : (
        <>
          {ordered.map(([who, items]) => (
            <section key={who || "-"} className="space-y-2">
              <h2 className="flex items-baseline justify-between px-1 text-xs font-bold uppercase tracking-wider text-muted">
                <span>{who ? `Voor ${who}` : "Nog niet bepaald voor wie"}</span>
                <span className="font-medium normal-case tracking-normal tabular-nums">
                  {items.filter((g) => g.bought).length}/{items.length} gekocht
                </span>
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {items.map((g) => (
                  <li key={g.id}>
                    <SwipeToDelete
                      open={swipeOpen === g.id}
                      onOpenChange={(o) => setSwipeOpen(o ? g.id : null)}
                      onDelete={() => remove(g)}
                      label={`${g.name} verwijderen`}
                    >
                      <GiftRow
                        gift={g}
                        open={openId === g.id}
                        onOpen={() => setOpenId(openId === g.id ? null : g.id)}
                        onToggle={() => toggle(g)}
                      />
                    </SwipeToDelete>
                    {openId === g.id && (
                      <GiftEditor gift={g} mine={g.addedBy === me} onDone={() => setOpenId(null)} onDelete={() => remove(g)} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="space-y-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted">Totaal ideeën</dt>
                <dd className="text-lg font-semibold tabular-nums">{euro(total)}</dd>
              </div>
              <div>
                <dt className="text-muted">Al gekocht</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {euro(spent)} <span className="text-sm font-normal text-muted">({boughtCount} van {here.length})</span>
                </dd>
              </div>
            </dl>
            {boughtCount > 0 && (
              <button
                onClick={() => {
                  if (confirm(`${boughtCount} gekochte cadeau${boughtCount === 1 ? "" : "s"} van de lijst halen?`)) start(() => clearBoughtGifts(occasion));
                }}
                className="h-11 w-full rounded-xl border border-line text-[15px] font-medium text-muted"
              >
                Gekochte cadeaus opruimen
              </button>
            )}
          </div>
        </>
      )}
      <p className="px-1 text-xs text-muted">
        Tik op een cadeau voor prijs, link en notitie. Vink af als het gekocht is, veeg naar links om te verwijderen. Een slotje betekent: alleen jij ziet het.
      </p>
    </div>
  );
}

function GiftRow({ gift: g, open, onOpen, onToggle }: { gift: Gift; open: boolean; onOpen: () => void; onToggle: () => void }) {
  const sub = [g.price != null ? euro(g.price) : null, g.note].filter(Boolean).join(" · ");
  return (
    <div className="flex min-h-16 items-center gap-3 bg-surface pl-3 pr-4">
      <button
        onClick={onToggle}
        aria-label={g.bought ? `${g.name}: nog niet gekocht` : `${g.name}: gekocht`}
        aria-pressed={g.bought}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full`}
      >
        <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${g.bought ? "border-accent bg-accent text-accent-ink" : "border-line"}`}>
          {g.bought && <IconCheck className="h-4 w-4" />}
        </span>
      </button>
      <button onClick={onOpen} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left">
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${g.bought ? "text-muted line-through" : ""}`}>
            {g.secret && <span aria-label="Geheim, alleen jij ziet dit">🔒 </span>}
            {g.name}
          </span>
          {sub && <span className="block truncate text-sm text-muted">{sub}</span>}
        </span>
        {g.link && <span className="shrink-0 text-xs font-medium text-accent">link</span>}
        <PersonDot person={g.addedBy} />
      </button>
    </div>
  );
}

function QuickAdd({ occasion, recipients }: { occasion: OccasionId; recipients: string[] }) {
  const [name, setName] = useState("");
  const [who, setWho] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const fd = new FormData();
    fd.set("name", name);
    fd.set("recipient", who);
    fd.set("occasion", occasion);
    start(async () => {
      const res = await saveGift(undefined, fd);
      if (res?.error) return setError(res.error);
      setError(null);
      setName("");
      ref.current?.focus();
    });
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={ref}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cadeau-idee…"
          aria-label="Cadeau-idee"
          enterKeyHint="done"
          autoComplete="off"
          maxLength={120}
          className="h-14 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 text-[17px] outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          disabled={pending || !name.trim()}
          aria-label="Toevoegen"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink disabled:opacity-50"
        >
          <IconPlus className="h-7 w-7" />
        </button>
      </div>
      <input
        value={who}
        onChange={(e) => setWho(e.target.value)}
        list="cadeau-voor"
        placeholder="Voor wie? (mag leeg)"
        aria-label="Voor wie"
        autoComplete="off"
        maxLength={60}
        className={input}
      />
      <datalist id="cadeau-voor">
        {recipients.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      {error && <p className="px-1 text-sm text-danger">{error}</p>}
    </form>
  );
}

function GiftEditor({
  gift: g,
  mine,
  onDone,
  onDelete,
}: {
  gift: Gift;
  mine: boolean;
  onDone: () => void;
  onDelete: () => void;
}) {
  const [state, action, pending] = useActionState<GiftState, FormData>(saveGift, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-3 border-t border-line bg-surface-2/60 px-4 py-4">
      <input type="hidden" name="id" value={g.id} />
      <Field label="Cadeau">
        <input name="name" defaultValue={g.name} required maxLength={120} className={input} />
      </Field>
      <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
        <Field label="Voor wie">
          <input name="recipient" defaultValue={g.recipient ?? ""} list="cadeau-voor" maxLength={60} autoComplete="off" className={input} />
        </Field>
        <Field label="Prijs">
          <input
            name="price"
            defaultValue={g.price != null ? String(g.price).replace(".", ",") : ""}
            inputMode="decimal"
            placeholder="€"
            className={input}
          />
        </Field>
      </div>
      <Field label="Gelegenheid">
        <select name="occasion" defaultValue={g.occasion} className={input}>
          {OCCASIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Link (winkel)">
        <div className="flex gap-2">
          <input name="link" type="url" defaultValue={g.link ?? ""} placeholder="https://…" inputMode="url" className={input} />
          {g.link && (
            <a
              href={g.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 shrink-0 items-center rounded-xl border border-line bg-surface px-3 text-[15px] font-medium text-accent"
            >
              Open
            </a>
          )}
        </div>
      </Field>
      <Field label="Notitie">
        <input name="note" defaultValue={g.note ?? ""} maxLength={300} placeholder="Maat, kleur, waar te koop…" className={input} />
      </Field>
      {mine ? (
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-3">
          <input type="checkbox" name="secret" defaultChecked={g.secret} className="h-5 w-5 accent-[var(--accent)]" />
          <span className="text-[15px]">
            Geheim <span className="text-muted">· alleen ik zie dit (verrassing)</span>
          </span>
        </label>
      ) : (
        <input type="hidden" name="secret" value={String(g.secret)} />
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="h-12 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-60">
          {pending ? "Opslaan…" : "Opslaan"}
        </button>
        <button type="button" onClick={onDelete} className="h-12 rounded-xl border border-line bg-surface px-4 text-[15px] font-medium text-danger">
          Verwijderen
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block px-1 text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
