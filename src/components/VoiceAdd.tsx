"use client";

import { useEffect, useRef, useState } from "react";
import { newId, runOrQueue } from "@/lib/offline-queue";
import { asLine, splitSpoken, type Spoken } from "@/lib/spoken";
import { parseSpoken } from "@/app/spraak-actions";
import { IconMic } from "./icons";
import { Stepper } from "./Stepper";

// Spraakherkenning van de browser (Safari/Chrome: webkitSpeechRecognition). Niet overal aanwezig.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
const recognitionClass = () =>
  typeof window === "undefined"
    ? null
    : ((window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition ??
      null);

type Row = Spoken & { on: boolean };

/** Microfoonknop naast "Product toevoegen": inspreken → Claude maakt er losse regels van → controleren → op de lijst. */
export function VoiceAdd() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Boodschappen inspreken"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-accent"
      >
        <IconMic className="h-7 w-7" />
      </button>
      {open && <VoiceSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function VoiceSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [noSpeech, setNoSpeech] = useState(false); // geen spraakherkenning: dicteer met het toetsenbord
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const listen = () => {
    const R = recognitionClass();
    if (!R) {
      setNoSpeech(true);
      area.current?.focus();
      return;
    }
    const r = new R();
    r.lang = "nl-NL";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let done = "";
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) done += `${res[0].transcript} `;
        else live += res[0].transcript;
      }
      if (done) setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${done}`.replace(/\s+/g, " "));
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") setNoSpeech(true);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setNoSpeech(true);
    }
  };
  const stop = () => rec.current?.stop();

  // Meteen beginnen met luisteren; bij sluiten de microfoon loslaten.
  useEffect(() => {
    listen();
    return () => rec.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const convert = async () => {
    stop();
    const all = `${text} ${interim}`.trim();
    if (!all) return;
    setBusy(true);
    let items: Spoken[];
    try {
      items = navigator.onLine ? await parseSpoken(all) : splitSpoken(all);
    } catch {
      items = splitSpoken(all); // geen internet in de winkel: dan splitsen we zelf
    }
    setBusy(false);
    setRows(items.map((i) => ({ ...i, on: true })));
  };

  const addAll = () => {
    for (const r of rows ?? []) if (r.on && r.name.trim()) void runOrQueue({ k: "add", id: newId(), text: asLine({ ...r, name: r.name.trim() }) });
    onClose();
  };
  const chosen = (rows ?? []).filter((r) => r.on && r.name.trim()).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spraak-kop"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl"
      >
        <h2 id="spraak-kop" className="text-lg font-semibold">Boodschappen inspreken</h2>

        {rows === null ? (
          <>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={listening ? stop : listen}
                aria-label={listening ? "Stoppen met luisteren" : "Opnieuw luisteren"}
                className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${listening ? "bg-danger text-white" : "bg-accent-soft text-accent"}`}
              >
                {listening && <span className="absolute inset-0 animate-ping rounded-full bg-danger/40" />}
                <IconMic className="relative h-7 w-7" />
              </button>
              <p className="text-sm text-muted">
                {noSpeech
                  ? "Tik in het tekstvak op de microfoon van je toetsenbord en spreek je boodschappen in."
                  : listening
                    ? "Ik luister… Noem je boodschappen, bijvoorbeeld: twee pakken melk, kaas en bananen."
                    : "Tik op de microfoon om (verder) in te spreken, of pas de tekst aan."}
              </p>
            </div>
            <textarea
              ref={area}
              value={listening && interim ? `${text}${interim}` : text}
              onChange={(e) => setText(e.target.value)}
              readOnly={listening}
              rows={4}
              placeholder="Twee pakken melk, kaas, bananen…"
              aria-label="Ingesproken boodschappen"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[17px] outline-none focus:border-accent"
            />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onClose} className="h-12 rounded-xl border border-line bg-surface text-[15px] font-medium">
                Annuleren
              </button>
              <button
                onClick={convert}
                disabled={busy || !`${text}${interim}`.trim()}
                className="h-12 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-40"
              >
                {busy ? "Even denken…" : "Omzetten"}
              </button>
            </div>
          </>
        ) : (
          <>
            {rows.length === 0 ? (
              <p className="text-sm text-muted">Ik heb er geen boodschappen in gehoord. Probeer het nog een keer.</p>
            ) : (
              <>
                <p className="text-sm text-muted">Klopt dit? Pas aan of vink uit wat niet op de lijst moet.</p>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {rows.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={r.on}
                        onChange={(e) => setRows((rs) => rs!.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))}
                        aria-label={`${r.name} toevoegen`}
                        className="h-5 w-5 shrink-0 accent-[var(--accent)]"
                      />
                      <input
                        value={r.name}
                        onChange={(e) => setRows((rs) => rs!.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                        aria-label="Naam"
                        className={`h-10 min-w-0 flex-1 bg-transparent text-[16px] outline-none ${r.on ? "" : "text-muted line-through"}`}
                      />
                      <Stepper value={r.quantity} min={1} label={r.name} onChange={(n) => setRows((rs) => rs!.map((x, j) => (j === i ? { ...x, quantity: n } : x)))} />
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setRows(null)} className="h-12 rounded-xl border border-line bg-surface text-[15px] font-medium">
                Terug
              </button>
              <button onClick={addAll} disabled={chosen === 0} className="h-12 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-40">
                {chosen === 1 ? "Zet 1 op de lijst" : `Zet ${chosen} op de lijst`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
