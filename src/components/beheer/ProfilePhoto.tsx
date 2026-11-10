"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PersonDot } from "../PersonDot";
import { useHasAvatar } from "../Avatars";
import type { PersonId } from "@/lib/types";

const V = 280; // voorbeeldgrootte van de uitsnede
const MAX_SOURCE = 1200; // grote telefoonfoto's eerst verkleinen (Safari tekent te grote beelden niet altijd volledig)

/** Laadt een foto als <img> (respecteert de EXIF-draairichting) en verkleint hem naar een canvas. */
async function loadPhoto(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SOURCE / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Profielfoto kiezen, uitsnijden (rondje) en opslaan — zoals in pot-laden. */
export function ProfilePhoto({ me, name }: { me: PersonId; name: string }) {
  const router = useRouter();
  const hasPhoto = useHasAvatar(me);
  const picker = useRef<HTMLInputElement>(null);
  const [bitmap, setBitmap] = useState<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setMessage(null);
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) && !f.type.startsWith("image/")) return setMessage({ text: "Kies een foto (JPEG, PNG of WebP).", bad: true });
    if (f.size > 15 * 1024 * 1024) return setMessage({ text: "Foto is te groot (maximaal 15 MB).", bad: true });
    try {
      setBitmap(await loadPhoto(f));
    } catch {
      setMessage({ text: "Deze foto kan de browser niet openen. Probeer een JPEG of PNG.", bad: true });
    }
  };

  const save = async (blob: Blob) => {
    setBitmap(null);
    setBusy(true);
    const body = new FormData();
    body.append("foto", blob, "profiel.jpg");
    const res = await fetch("/api/foto/persoon", { method: "POST", body });
    setBusy(false);
    if (!res.ok) return setMessage({ text: (await res.json().catch(() => ({}))).error ?? "Opslaan mislukt", bad: true });
    setMessage({ text: "Foto opgeslagen." });
    router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    await fetch("/api/foto/persoon", { method: "DELETE" });
    setBusy(false);
    setMessage({ text: "Foto verwijderd." });
    router.refresh();
  };

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-4">
      <PersonDot person={me} size="lg" title={`Profielfoto van ${name}`} />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-semibold">{name}</p>
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => picker.current?.click()}
            className="h-10 whitespace-nowrap rounded-xl border border-line px-3 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Bezig…" : hasPhoto ? "Andere foto kiezen" : "Foto kiezen"}
          </button>
          {hasPhoto && (
            <button type="button" disabled={busy} onClick={remove} className="h-10 whitespace-nowrap rounded-xl border border-danger/40 px-3 text-sm font-semibold text-danger disabled:opacity-50">
              Foto verwijderen
            </button>
          )}
        </div>
        <p className="text-xs text-muted">Jij kiest de uitsnede. Alleen het gezin ziet je foto.</p>
        {message && (
          <p role={message.bad ? "alert" : "status"} className={`text-sm font-medium ${message.bad ? "text-danger" : "text-accent"}`}>
            {message.text}
          </p>
        )}
      </div>
      <input ref={picker} type="file" accept="image/*" onChange={pick} className="sr-only" tabIndex={-1} aria-hidden />
      {bitmap && <CropDialog bitmap={bitmap} onCancel={() => setBitmap(null)} onDone={save} />}
    </div>
  );
}

function CropDialog({ bitmap, onCancel, onDone }: { bitmap: HTMLCanvasElement; onCancel: () => void; onDone: (b: Blob) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const okButton = useRef<HTMLButtonElement>(null);
  const [zoom, setZoom] = useState(1);
  const [px, setPx] = useState(50);
  const [py, setPy] = useState(50);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const draw = (ctx: CanvasRenderingContext2D, size: number) => {
    const k = size / V;
    const sc = Math.max(V / bitmap.width, V / bitmap.height) * zoom;
    const dw = bitmap.width * sc;
    const dh = bitmap.height * sc;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(bitmap, (-(dw - V) * px) / 100 * k, (-(dh - V) * py) / 100 * k, dw * k, dh * k);
  };

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, V);
  });

  useEffect(() => {
    okButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const finish = () => {
    const out = document.createElement("canvas");
    out.width = out.height = 512;
    draw(out.getContext("2d")!, 512);
    out.toBlob((b) => b && onDone(b), "image/jpeg", 0.88);
  };

  const slider = "w-full accent-[var(--accent)]";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-label="Foto uitsnijden" className="w-full max-w-sm space-y-4 rounded-2xl bg-surface p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-semibold">Kies de uitsnede</h2>
          <p className="text-sm text-muted">Sleep de foto of gebruik de schuifjes. Het rondje is wat de anderen zien.</p>
        </div>
        <div className="flex justify-center">
          <canvas
            ref={canvas}
            width={V}
            height={V}
            aria-label="Voorbeeld van de uitsnede"
            className="max-w-full touch-none rounded-full bg-surface-2"
            onPointerDown={(e) => {
              drag.current = { x: e.clientX, y: e.clientY, px, py };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              setPx(Math.max(0, Math.min(100, d.px - (e.clientX - d.x) / 2)));
              setPy(Math.max(0, Math.min(100, d.py - (e.clientY - d.y) / 2)));
            }}
            onPointerUp={() => (drag.current = null)}
          />
        </div>
        <label className="block text-sm font-medium text-muted">
          Inzoomen
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className={slider} />
        </label>
        <label className="block text-sm font-medium text-muted">
          Horizontaal
          <input type="range" min={0} max={100} value={px} onChange={(e) => setPx(Number(e.target.value))} className={slider} />
        </label>
        <label className="block text-sm font-medium text-muted">
          Verticaal
          <input type="range" min={0} max={100} value={py} onChange={(e) => setPy(Number(e.target.value))} className={slider} />
        </label>
        <div className="flex gap-2">
          <button ref={okButton} type="button" onClick={finish} className="h-12 flex-1 rounded-xl bg-accent font-semibold text-accent-ink">
            Foto gebruiken
          </button>
          <button type="button" onClick={onCancel} className="h-12 flex-1 rounded-xl border border-line font-semibold">
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}
