"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { deleteWatchItem, saveWatchItem } from "@/app/watchlist-actions";
import { IconCamera } from "../icons";

export type WatchItem = {
  id: string;
  name: string;
  brand: string | null;
  content: string | null;
  ean: string | null;
  photo_path: string | null;
  max_price: number | null;
  min_discount_pct: number | null;
};

type Read = { herkend: boolean; merk: string | null; naam: string | null; variant: string | null; inhoud: string | null; ean: string | null; toelichting: string };

const field = "h-12 w-full rounded-xl border border-line bg-surface px-3 text-[17px] outline-none focus:border-accent";
const label = "mb-1 block text-sm font-medium text-muted";

export function WatchForm({
  item,
  photo,
  startWithCamera,
  canRecognize,
}: {
  item: WatchItem | null;
  photo: string | null;
  startWithCamera: boolean;
  canRecognize: boolean;
}) {
  const [state, action, saving] = useActionState(saveWatchItem, undefined);
  const [busy, start] = useTransition();
  const [values, setValues] = useState({
    name: item?.name ?? "",
    brand: item?.brand ?? "",
    content: item?.content ?? "",
    ean: item?.ean ?? "",
    photo_path: "",
    max_price: item?.max_price != null ? String(item.max_price).replace(".", ",") : "",
    min_discount_pct: item?.min_discount_pct != null ? String(item.min_discount_pct) : "",
  });
  const [preview, setPreview] = useState<string | null>(photo);
  const [reading, setReading] = useState(false);
  const [read, setRead] = useState<Read | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (startWithCamera) camera.current?.click();
  }, [startWithCamera]);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setReading(true);
    setRead(null);
    setNote(null);
    try {
      const body = new FormData();
      body.append("foto", file);
      const res = await fetch("/api/foto/product", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Uploaden mislukt");
      setValues((v) => ({ ...v, photo_path: data.photoPath }));
      if (data.warning) setNote(data.warning);
      if (data.read) {
        const r = data.read as Read;
        setRead(r);
        if (r.herkend) {
          setValues((v) => ({
            ...v,
            name: r.naam ?? v.name,
            brand: r.merk ?? v.brand,
            content: [r.variant, r.inhoud].filter(Boolean).join(", ") || v.content,
            ean: r.ean?.replace(/\D/g, "") ?? v.ean,
          }));
        }
      }
    } catch (err) {
      setNote((err as Error).message);
    } finally {
      setReading(false);
      e.target.value = "";
    }
  };

  return (
    <form action={action} className="space-y-5">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="photo_path" value={values.photo_path} />

      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto van het product" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <IconCamera className="h-8 w-8" />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <button
            type="button"
            onClick={() => camera.current?.click()}
            disabled={reading}
            className="h-11 w-full whitespace-nowrap rounded-xl bg-accent px-3 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            {reading ? "Foto wordt gelezen…" : preview ? "Andere foto" : "Foto maken"}
          </button>
          <p className="text-xs text-muted">
            {canRecognize ? "De app leest merk, naam en inhoud van de verpakking. Controleer het daarna even." : "Automatisch herkennen staat uit; de foto wordt wel bewaard."}
          </p>
        </div>
        <input ref={camera} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
      </div>

      {read && (
        <p role="status" className={`rounded-xl px-3 py-2 text-sm ${read.herkend ? "bg-accent-soft text-accent" : "bg-deal-soft text-deal"}`}>
          {read.herkend ? "Herkend: " : "Niet goed herkend: "}
          {read.toelichting} {read.herkend && "Klopt het? Pas anders hieronder aan."}
        </p>
      )}
      {note && <p className="rounded-xl bg-deal-soft px-3 py-2 text-sm text-deal">{note}</p>}

      <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="brand" className={label}>Voorkeursmerk</label>
            <input id="brand" name="brand" value={values.brand} onChange={set("brand")} placeholder="Bijv. Lenor" className={field} />
          </div>
          <div>
            <label htmlFor="name" className={label}>Product</label>
            <input id="name" name="name" required value={values.name} onChange={set("name")} placeholder="Bijv. Wasmiddelpods" className={field} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="content" className={label}>Inhoud / variant</label>
            <input id="content" name="content" value={values.content} onChange={set("content")} placeholder="Bijv. 30 stuks" className={field} />
          </div>
          <div>
            <label htmlFor="ean" className={label}>EAN (optioneel)</label>
            <input id="ean" name="ean" inputMode="numeric" value={values.ean} onChange={set("ean")} className={field} />
          </div>
        </div>
        <p className="text-xs text-muted">Zonder merk telt elke aanbieding van dit soort product.</p>
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wider text-muted">Wanneer is het een goede aanbieding?</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="max_price" className={label}>Prijs maximaal (€)</label>
            <input id="max_price" name="max_price" inputMode="decimal" value={values.max_price} onChange={set("max_price")} placeholder="Geen grens" className={field} />
          </div>
          <div>
            <label htmlFor="min_discount_pct" className={label}>Korting minimaal (%)</label>
            <input
              id="min_discount_pct"
              name="min_discount_pct"
              inputMode="numeric"
              value={values.min_discount_pct}
              onChange={set("min_discount_pct")}
              placeholder="Geen grens"
              className={field}
            />
          </div>
        </div>
        <p className="text-xs text-muted">Vul je allebei in, dan moet de aanbieding aan allebei voldoen. Laat je ze leeg, dan telt elke actie.</p>
      </fieldset>

      {state?.error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{state.error}</p>}

      <button disabled={saving || reading} className="w-full rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-accent-ink disabled:opacity-60">
        {saving ? "Opslaan…" : item ? "Opslaan" : "Op de watchlist zetten"}
      </button>
      {item && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirm(`"${[item.brand, item.name].filter(Boolean).join(" ")}" van de watchlist halen?`)) start(() => deleteWatchItem(item.id));
          }}
          className="h-12 w-full rounded-2xl border border-danger/40 text-[15px] font-medium text-danger"
        >
          Van de watchlist halen
        </button>
      )}
    </form>
  );
}
