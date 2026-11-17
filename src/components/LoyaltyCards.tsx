"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { deleteCard, saveCard, type CardState } from "@/app/kaart-actions";
import { Barcode } from "./Barcode";
import { IconCamera, IconPlus } from "./icons";
import type { BarcodeFormat } from "@/lib/barcode";

export type CardView = { id: string; store: string; storeName: string; owner: "vincent" | "marleen" | "gezin"; number: string; format: BarcodeFormat };

const OWNER: Record<CardView["owner"], string> = { vincent: "Vincent", marleen: "Marleen", gezin: "Gezin" };
const field = "h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-[16px] outline-none focus:border-accent";
const CACHE_KEY = "boodschappen-klantenkaarten";

/** Klantenkaarten: overzicht, toevoegen en schermvullend tonen bij de kassa (werkt zonder internet). */
export function LoyaltyCards({
  cards: fromServer,
  stores,
  openId,
}: {
  cards: CardView[];
  stores: { id: string; name: string }[];
  openId: string | null;
}) {
  // Ook in de telefoon bewaren: zo is de pas er altijd, ook als de pagina zonder internet uit de cache komt.
  const [cards, setCards] = useState(fromServer);
  useEffect(() => {
    if (fromServer.length) {
      setCards(fromServer);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(fromServer));
      } catch {
        /* privémodus */
      }
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]") as CardView[];
      if (saved.length && !navigator.onLine) setCards(saved);
      else setCards([]);
    } catch {
      setCards([]);
    }
  }, [fromServer]);

  const [shown, setShown] = useState<CardView | null>(() => fromServer.find((c) => c.id === openId) ?? null);
  const [editing, setEditing] = useState<CardView | "nieuw" | null>(fromServer.length ? null : "nieuw");
  const [, start] = useTransition();

  return (
    <div className="space-y-4">
      {cards.length === 0 && editing !== "nieuw" && (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-muted">Nog geen klantenkaarten.</p>
      )}
      <ul className="space-y-3">
        {cards.map((c) => (
          <li key={c.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <button type="button" onClick={() => setShown(c)} className="block w-full p-4 text-left" aria-label={`${c.storeName}-pas tonen`}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-semibold">{c.storeName}</span>
                <span className="text-sm text-muted">{OWNER[c.owner]}</span>
              </span>
              <span className="mt-3 block rounded-xl bg-white p-3">
                <Barcode value={c.number} format={c.format} className={c.format === "qr" ? "mx-auto h-28 w-28" : "h-20 w-full"} />
                <span className="mt-1 block text-center font-mono text-sm tracking-widest text-black">{c.number}</span>
              </span>
              <span className="mt-2 block text-center text-sm font-medium text-accent">Tik om groot te tonen bij de kassa</span>
            </button>
            <div className="flex border-t border-line">
              <button type="button" onClick={() => setEditing(c)} className="h-11 flex-1 text-sm font-medium">
                Wijzigen
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`${c.storeName}-pas van ${OWNER[c.owner]} verwijderen?`)) start(() => deleteCard(c.id));
                }}
                className="h-11 flex-1 border-l border-line text-sm font-medium text-danger"
              >
                Verwijderen
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <CardForm card={editing === "nieuw" ? null : editing} stores={stores} onDone={() => setEditing(null)} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("nieuw")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[15px] font-medium text-accent"
        >
          <IconPlus className="h-5 w-5" /> Pas toevoegen
        </button>
      )}

      {shown && <FullCard card={shown} onClose={() => setShown(null)} />}
    </div>
  );
}

/** Schermvullend, zwart op wit; scherm blijft aan zolang de pas open staat. */
function FullCard({ card, onClose }: { card: CardView; onClose: () => void }) {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${card.storeName}-pas`}
      onClick={onClose}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-white px-5 text-black"
    >
      <p className="text-2xl font-semibold">{card.storeName}</p>
      <div className="w-full max-w-md">
        <Barcode value={card.number} format={card.format} className={card.format === "qr" ? "mx-auto aspect-square w-[min(80vw,22rem)]" : "h-40 w-full"} />
        <p className="mt-3 text-center font-mono text-lg tracking-[0.2em]">{card.number}</p>
      </div>
      <p className="text-sm text-neutral-500">Zet je scherm op de hoogste helderheid · tik om te sluiten</p>
    </div>
  );
}

function CardForm({ card, stores, onDone }: { card: CardView | null; stores: { id: string; name: string }[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<CardState, FormData>(saveCard, undefined);
  const [number, setNumber] = useState(card?.number ?? "");
  const [storeChoice, setStoreChoice] = useState(card ? (card.store.startsWith("anders:") ? "__anders__" : card.store) : "jumbo");
  const [format, setFormat] = useState<"" | "qr" | "code128">(card?.format === "qr" ? "qr" : card?.format === "code128" ? "code128" : "");
  const [reading, setReading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  // Foto van de streepjescode op de pas: de app leest het nummer uit (zelfde als bij de watchlist).
  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReading(true);
    setNote(null);
    try {
      const body = new FormData();
      body.append("foto", file);
      body.append("soort", "streepjescode");
      const res = await fetch("/api/foto/product", { method: "POST", body });
      const data = await res.json();
      if (data.ean) setNumber(data.ean);
      else setNote(data.warning ?? data.error ?? "Nummer niet gelezen; typ het over.");
    } catch {
      setNote("Geen verbinding. Typ het nummer over.");
    } finally {
      setReading(false);
    }
  };

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-lg font-semibold">{card ? "Pas wijzigen" : "Pas toevoegen"}</h2>
      {card && <input type="hidden" name="id" value={card.id} />}
      <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
        <label className="block">
          <span className="mb-1 block px-1 text-xs font-medium text-muted">Winkel</span>
          <select name="store" value={storeChoice} onChange={(e) => setStoreChoice(e.target.value)} className={field}>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="__anders__">Andere winkel…</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block px-1 text-xs font-medium text-muted">Van wie</span>
          <select name="owner" defaultValue={card?.owner ?? "gezin"} className={field}>
            <option value="gezin">Gezin</option>
            <option value="vincent">Vincent</option>
            <option value="marleen">Marleen</option>
          </select>
        </label>
      </div>
      {storeChoice === "__anders__" && (
        <label className="block">
          <span className="mb-1 block px-1 text-xs font-medium text-muted">Naam van de winkel</span>
          <input name="store_name" defaultValue={card?.store.startsWith("anders:") ? card.storeName : ""} placeholder="Bijv. HEMA, IKEA, Karwei" maxLength={40} className={field} />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block px-1 text-xs font-medium text-muted">Soort code op de pas</span>
        <select name="format" value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className={field}>
          <option value="">Streepjescode (automatisch)</option>
          <option value="qr">QR-code (vierkant)</option>
          <option value="code128">Streepjescode, Code 128</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block px-1 text-xs font-medium text-muted">Nummer onder de code</span>
        <div className="flex gap-2">
          <input
            name="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Bijv. 2620123456789"
            className={field}
          />
          <button
            type="button"
            onClick={() => camera.current?.click()}
            disabled={reading}
            aria-label="Foto van de streepjescode maken"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-accent disabled:opacity-50"
          >
            <IconCamera className="h-5 w-5" />
          </button>
        </div>
      </label>
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
      {reading && <p className="text-sm text-muted">Streepjescode lezen…</p>}
      {note && <p className="text-sm text-deal">{note}</p>}
      {number.trim().length >= 4 && (
        <div className="rounded-xl bg-white p-3">
          <Barcode
            value={number.replace(/\s+/g, "").toUpperCase()}
            format={format || (/^\d{13}$|^\d{8}$/.test(number.replace(/\s+/g, "")) ? "ean13" : "code128")}
            className={format === "qr" ? "mx-auto h-40 w-40" : "h-16 w-full"}
          />
          <p className="mt-1 text-center text-xs text-neutral-500">Voorbeeld. Klopt het nummer met je pas?</p>
        </div>
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="h-12 flex-1 rounded-xl border border-line bg-surface text-[15px] font-medium">
          Annuleren
        </button>
        <button disabled={pending || !number.trim()} className="h-12 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-50">
          {pending ? "Opslaan…" : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
