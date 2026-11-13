"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { IconCamera, IconReceipt } from "../icons";

/**
 * Bon fotograferen of kiezen. Alleen het versturen van de foto duurt even (een paar seconden);
 * het uitlezen gebeurt daarna op de server, dus je kunt meteen verder in de app.
 */
export function ReceiptUpload() {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"rust" | "versturen" | "verstuurd">("rust");
  const [error, setError] = useState<string | null>(null);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setState("versturen");
    setError(null);
    try {
      const body = new FormData();
      body.append("foto", file);
      const res = await fetch("/api/foto/bon", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Uploaden mislukt");
      setState("verstuurd");
      router.refresh(); // de nieuwe bon verschijnt met "Wordt uitgelezen…"
      setTimeout(() => setState((s) => (s === "verstuurd" ? "rust" : s)), 8000);
    } catch (err) {
      setError((err as Error).message);
      setState("rust");
    }
  };

  const busy = state === "versturen";
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => camera.current?.click()}
          disabled={busy}
          className="flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-accent px-3 text-[15px] font-semibold text-accent-ink disabled:opacity-60"
        >
          <IconCamera className="h-5 w-5" /> Bon fotograferen
        </button>
        <button
          onClick={() => picker.current?.click()}
          disabled={busy}
          className="flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-line bg-surface px-3 text-[15px] font-semibold disabled:opacity-60"
        >
          <IconReceipt className="h-5 w-5" /> Foto kiezen
        </button>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={upload} className="hidden" />
      <input ref={picker} type="file" accept="image/*" onChange={upload} className="hidden" />
      {busy && (
        // Schermvullend: tijdens het versturen kun je niet per ongeluk wegtikken (duurt maar een paar seconden).
        <div role="status" className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-bg/90 px-8 text-center backdrop-blur-sm">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-accent/25 border-t-accent" aria-hidden />
          <p className="text-lg font-semibold">Foto wordt verstuurd…</p>
          <p className="text-sm text-muted">Even geduld. Daarna wordt de bon op de achtergrond uitgelezen en kun je gewoon verder.</p>
        </div>
      )}
      {state === "verstuurd" && (
        <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          Foto ontvangen. De bon wordt nu uitgelezen; je kunt gewoon verder in de app. Je krijgt een melding als hij klaar is.
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
