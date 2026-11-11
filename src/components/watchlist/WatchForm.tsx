"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { deleteWatchItem, saveWatchItem } from "@/app/watchlist-actions";
import { IconCamera, IconSearch } from "../icons";

export type WatchItem = {
  id: string;
  name: string;
  brand: string | null;
  content: string | null;
  ean: string | null;
  photo_path: string | null;
  barcode_path: string | null;
  image_url: string | null;
  max_price: number | null;
  min_discount_pct: number | null;
};

type Read = { herkend: boolean; merk: string | null; naam: string | null; variant: string | null; inhoud: string | null; ean: string | null; toelichting: string };
type Candidate = { url: string; name: string | null; brand: string | null; quantity: string | null; ean: string | null };
type Kind = "voorkant" | "streepjescode";

const field = "h-12 w-full rounded-xl border border-line bg-surface px-3 text-[17px] outline-none focus:border-accent";
const label = "mb-1 block text-sm font-medium text-muted";

export function WatchForm({
  item,
  photo,
  barcodePhoto,
  startWithCamera,
  canRecognize,
}: {
  item: WatchItem | null;
  photo: string | null;
  barcodePhoto: string | null;
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
    barcode_path: "",
    image_url: item?.image_url ?? "",
    max_price: item?.max_price != null ? String(item.max_price).replace(".", ",") : "",
    min_discount_pct: item?.min_discount_pct != null ? String(item.min_discount_pct) : "",
  });
  const [previews, setPreviews] = useState<Record<Kind, string | null>>({ voorkant: photo, streepjescode: barcodePhoto });
  const [reading, setReading] = useState<Kind | null>(null);
  const [read, setRead] = useState<Read | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [eanNote, setEanNote] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const cameras = { voorkant: useRef<HTMLInputElement>(null), streepjescode: useRef<HTMLInputElement>(null) };

  useEffect(() => {
    if (startWithCamera) cameras.voorkant.current?.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWithCamera]);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const onPhoto = (kind: Kind) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviews((p) => ({ ...p, [kind]: URL.createObjectURL(file) }));
    setReading(kind);
    if (kind === "voorkant") {
      setRead(null);
      setNote(null);
    } else setEanNote(null);
    try {
      const body = new FormData();
      body.append("foto", file);
      body.append("soort", kind);
      const res = await fetch("/api/foto/product", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Uploaden mislukt");
      if (kind === "streepjescode") {
        setValues((v) => ({ ...v, barcode_path: data.photoPath, ean: data.ean ?? v.ean }));
        setEanNote(data.ean ? `Streepjescode gelezen: ${data.ean}` : (data.warning ?? null));
        return;
      }
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
            ean: v.ean || (r.ean?.replace(/\D/g, "") ?? ""),
          }));
        }
      }
    } catch (err) {
      (kind === "voorkant" ? setNote : setEanNote)((err as Error).message);
    } finally {
      setReading(null);
      e.target.value = "";
    }
  };

  const searchImage = async () => {
    setSearching(true);
    setCandidates(null);
    try {
      const params = new URLSearchParams();
      if (values.ean) params.set("ean", values.ean);
      const q = [values.brand, values.name].filter(Boolean).join(" ");
      if (q) params.set("q", q);
      if (values.brand) params.set("merk", values.brand);
      const res = await fetch(`/api/afbeelding?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Zoeken mislukt");
      setCandidates(data.results);
    } catch (err) {
      setNote((err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const choose = (c: Candidate) => {
    setValues((v) => ({
      ...v,
      image_url: c.url,
      // Alleen lege velden aanvullen; wat je zelf invulde blijft staan.
      brand: v.brand || c.brand || "",
      name: v.name || c.name || "",
      content: v.content || c.quantity || "",
      ean: v.ean || c.ean || "",
    }));
    setCandidates(null);
  };

  const tile = (kind: Kind, title: string) => (
    <button
      type="button"
      onClick={() => cameras[kind].current?.click()}
      disabled={reading !== null}
      className="group relative flex aspect-square w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2 text-muted disabled:opacity-70"
    >
      {previews[kind] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previews[kind]!} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          {kind === "voorkant" ? <IconCamera className="h-7 w-7" /> : <BarcodeIcon />}
          <span className="mt-1 px-1 text-center text-xs font-medium leading-tight">Foto maken</span>
        </>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-ink/65 py-1 text-center text-[11px] font-semibold text-white">
        {reading === kind ? "Lezen…" : title}
      </span>
    </button>
  );

  return (
    <form action={action} className="space-y-5">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="photo_path" value={values.photo_path} />
      <input type="hidden" name="barcode_path" value={values.barcode_path} />
      <input type="hidden" name="image_url" value={values.image_url} />

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <div className="grid grid-cols-3 gap-2">
          {tile("voorkant", "Voorkant")}
          {tile("streepjescode", "Streepjescode")}
          <div className="relative flex aspect-square w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-white text-muted">
            {values.image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={values.image_url} alt="Officiële afbeelding" className="absolute inset-0 h-full w-full object-contain p-1" />
                <button
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, image_url: "" }))}
                  aria-label="Officiële afbeelding weghalen"
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-sm text-white"
                >
                  ×
                </button>
              </>
            ) : (
              <span className="px-2 text-center text-xs leading-tight">Officiële afbeelding (optie)</span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-ink/65 py-1 text-center text-[11px] font-semibold text-white">Van internet</span>
          </div>
        </div>
        <button
          type="button"
          onClick={searchImage}
          disabled={searching || (!values.ean && !values.name && !values.brand)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-[15px] font-medium text-accent disabled:text-muted"
        >
          <IconSearch className="h-5 w-5" />
          {searching ? "Zoeken…" : values.image_url ? "Andere officiële afbeelding" : "Officiële afbeelding zoeken"}
        </button>
        <p className="text-xs text-muted">
          {canRecognize
            ? "Voorkant: de app leest merk, naam en inhoud. Streepjescode: de app leest de EAN-code. De officiële afbeelding zoekt op die code, anders op merk en naam."
            : "Automatisch herkennen staat uit; de foto's worden wel bewaard."}
        </p>
        <input ref={cameras.voorkant} type="file" accept="image/*" capture="environment" onChange={onPhoto("voorkant")} className="hidden" />
        <input ref={cameras.streepjescode} type="file" accept="image/*" capture="environment" onChange={onPhoto("streepjescode")} className="hidden" />
      </section>

      {candidates && (
        <section className="space-y-2 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">{candidates.length ? "Tik op de juiste afbeelding" : "Niets gevonden"}</h2>
            <button type="button" onClick={() => setCandidates(null)} className="text-sm text-muted">
              Sluiten
            </button>
          </div>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted">
              Geen afbeelding gevonden in Open Food Facts. Maak een foto van de streepjescode of pas merk en naam aan en zoek opnieuw.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 md:grid-cols-5">
              {candidates.map((c) => (
                <li key={c.url} className="min-w-0">
                  <button type="button" onClick={() => choose(c)} className="block w-full min-w-0 text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.url} alt="" loading="lazy" className="aspect-square w-full rounded-lg border border-line bg-white object-contain p-1" />
                    <span className="mt-1 line-clamp-2 text-[11px] leading-tight text-muted">{[c.brand, c.name, c.quantity].filter(Boolean).join(" · ") || "Onbekend"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted">Bron: Open Food Facts / Open Products Facts.</p>
        </section>
      )}

      {read && (
        <p role="status" className={`rounded-xl px-3 py-2 text-sm ${read.herkend ? "bg-accent-soft text-accent" : "bg-deal-soft text-deal"}`}>
          {read.herkend ? "Herkend: " : "Niet goed herkend: "}
          {read.toelichting} {read.herkend && "Klopt het? Pas anders hieronder aan."}
        </p>
      )}
      {eanNote && (
        <p role="status" className={`rounded-xl px-3 py-2 text-sm ${eanNote.startsWith("Streepjescode gelezen") ? "bg-accent-soft text-accent" : "bg-deal-soft text-deal"}`}>
          {eanNote}
        </p>
      )}
      {note && <p className="rounded-xl bg-deal-soft px-3 py-2 text-sm text-deal">{note}</p>}

      <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div>
            <label htmlFor="brand" className={label}>Voorkeursmerk</label>
            <input id="brand" name="brand" value={values.brand} onChange={set("brand")} placeholder="Bijv. Lenor" className={field} />
          </div>
          <div>
            <label htmlFor="name" className={label}>Product</label>
            <input id="name" name="name" required value={values.name} onChange={set("name")} placeholder="Bijv. Wasmiddelpods" className={field} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
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
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
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

      <button disabled={saving || reading !== null} className="w-full rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-accent-ink disabled:opacity-60">
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

function BarcodeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
      <path d="M4 6v12M7 6v12M10 6v9M13 6v12M16 6v9M20 6v12" />
    </svg>
  );
}
