"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { IconCamera, IconReceipt } from "../icons";

export function ReceiptUpload() {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("foto", file);
      const res = await fetch("/api/foto/bon", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Uploaden mislukt");
      const q = new URLSearchParams();
      if (data.warning) q.set("melding", data.warning);
      else if (data.note) q.set("melding", data.note);
      router.push(`/bonnen/${data.id}${q.size ? `?${q}` : ""}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

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
        <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          Foto opgeslagen. De bon wordt uitgelezen, dat duurt even…
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
