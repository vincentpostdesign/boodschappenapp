"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { addHitToList } from "@/app/watchlist-actions";
import { IconCheck, IconEye, IconPlus, IconTag } from "../icons";

type OfferView = {
  hitId: string;
  name: string;
  store: string;
  price: number | null;
  originalPrice: number | null;
  label: string | null;
  quantity: string | null;
  from: string | null;
  until: string | null;
  upcoming: boolean;
};
type ItemView = { id: string; title: string; sub: string; thumb: string | null; offers: OfferView[] };

const euro = (n: number) => `€${n.toFixed(2).replace(".", ",")}`;
const day = (d: string | null) =>
  d ? new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)).replace(/\./g, "") : "";

export function WatchOffers({ items, focusHit, autoAdd }: { items: ItemView[]; focusHit: string | null; autoAdd: boolean }) {
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [, start] = useTransition();
  const done = useRef(false);

  const add = (hitId: string) =>
    start(async () => {
      try {
        const res = await addHitToList(hitId);
        setAdded((s) => new Set(s).add(hitId));
        setMessage(res.added ? `${res.name} staat op de lijst.` : `${res.name} stond al op de lijst.`);
      } catch (e) {
        setMessage((e as Error).message);
      }
    });

  // Vanuit de melding: "Op de lijst" (één keer uitvoeren)
  useEffect(() => {
    if (autoAdd && focusHit && !done.current) {
      done.current = true;
      add(focusHit);
    }
    if (focusHit) document.getElementById(`hit-${focusHit}`)?.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!items.length) {
    return <p className="rounded-2xl bg-surface px-4 py-8 text-center text-muted">De watchlist is nog leeg.</p>;
  }

  return (
    <div className="space-y-4">
      {message && (
        <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          {message}
        </p>
      )}
      <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {items.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <Link href={`/watchlist/${item.id}`} className="flex items-center gap-3 px-4 py-3">
              {item.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumb} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
                  <IconEye className="h-5 w-5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-tight">{item.title}</span>
                <span className="block truncate text-sm text-muted">{item.sub || "Elke aanbieding"}</span>
              </span>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                  item.offers.length ? "bg-deal-soft text-deal" : "bg-surface-2 text-muted"
                }`}
              >
                {item.offers.length ? `${item.offers.length} actie${item.offers.length === 1 ? "" : "s"}` : "Geen actie"}
              </span>
            </Link>
            {item.offers.length > 0 && (
              <ul className="divide-y divide-line border-t border-line">
                {item.offers.slice(0, 4).map((o) => {
                  const on = added.has(o.hitId);
                  return (
                    <li
                      key={o.hitId}
                      id={`hit-${o.hitId}`}
                      className={`flex items-center gap-3 px-4 py-2.5 ${focusHit === o.hitId ? "bg-deal-soft/60" : ""}`}
                    >
                      <IconTag className="h-4 w-4 shrink-0 text-deal" />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block truncate font-medium">{o.name}</span>
                        <span className="block text-muted">
                          <strong className="text-ink">{o.store}</strong>
                          {o.price != null && <> · {euro(o.price)}</>}
                          {o.originalPrice != null && <s className="ml-1">{euro(o.originalPrice)}</s>}
                          {o.label && <> · {o.label}</>}
                          {o.upcoming ? ` · vanaf ${day(o.from)}` : o.until ? ` · t/m ${day(o.until)}` : ""}
                        </span>
                      </span>
                      <button
                        onClick={() => add(o.hitId)}
                        disabled={on}
                        aria-label={`${o.name} op de lijst zetten`}
                        className={`flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-3 text-xs font-semibold ${
                          on ? "bg-accent-soft text-accent" : "border border-line"
                        }`}
                      >
                        {on ? <IconCheck className="h-4 w-4" /> : <IconPlus className="h-4 w-4" />}
                        {on ? "Op de lijst" : "Lijst"}
                      </button>
                    </li>
                  );
                })}
                {item.offers.length > 4 && <li className="px-4 py-2 text-xs text-muted">+ {item.offers.length - 4} andere aanbiedingen</li>}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
