"use client";

import { useEffect, useState } from "react";
import { IconBell } from "../icons";

type Status = "laden" | "niet-ondersteund" | "ios-installeren" | "geweigerd" | "uit" | "aan";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function Notifications() {
  const [status, setStatus] = useState<Status>("laden");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (isIos() && !isStandalone()) return setStatus("ios-installeren");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setStatus("niet-ondersteund");
      }
      if (Notification.permission === "denied") return setStatus("geweigerd");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "aan" : "uit");
    })().catch(() => setStatus("niet-ondersteund"));
  }, []);

  const enable = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("De server heeft nog geen VAPID-sleutel.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "geweigerd" : "uit");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
      const res = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Opslaan mislukt");
      setStatus("aan");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Aanzetten mislukt");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setStatus("uit");
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/push/test", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setMessage(res.ok ? (body.sent ? "Testmelding verstuurd." : "Geen apparaat gevonden om naar te sturen.") : (body.error ?? "Mislukt"));
    setBusy(false);
  };

  const btn = "h-11 whitespace-nowrap rounded-xl px-4 text-sm font-semibold disabled:opacity-50";

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <IconBell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Meldingen op deze telefoon</p>
          <p className="text-sm text-muted">
            {status === "aan" && "Staan aan."}
            {status === "uit" && "Staan uit."}
            {status === "laden" && "Even kijken…"}
            {status === "geweigerd" && "Geblokkeerd in de instellingen van je browser."}
            {status === "niet-ondersteund" && "Deze browser ondersteunt geen meldingen."}
            {status === "ios-installeren" && "Op iPhone eerst de app op je beginscherm zetten."}
          </p>
        </div>
      </div>

      {status === "ios-installeren" && (
        <ol className="list-decimal space-y-1 rounded-xl bg-surface-2 py-3 pl-8 pr-3 text-sm">
          <li>Open deze pagina in <strong>Safari</strong>.</li>
          <li>Tik op de deelknop (vierkantje met pijl omhoog).</li>
          <li>Kies <strong>Zet op beginscherm</strong> en tik op <strong>Voeg toe</strong>.</li>
          <li>Open de app vanaf je beginscherm en zet hier de meldingen aan.</li>
          <li className="list-none -ml-5 pt-1 text-muted">Werkt vanaf iOS 16.4.</li>
        </ol>
      )}

      <div className="flex flex-wrap gap-2">
        {status === "uit" && (
          <button onClick={enable} disabled={busy} className={`${btn} bg-accent text-accent-ink`}>
            Meldingen aanzetten
          </button>
        )}
        {status === "aan" && (
          <>
            <button onClick={test} disabled={busy} className={`${btn} bg-accent text-accent-ink`}>
              Testmelding sturen
            </button>
            <button onClick={disable} disabled={busy} className={`${btn} border border-line`}>
              Uitzetten
            </button>
          </>
        )}
      </div>
      {message && <p className="text-sm text-muted" role="status">{message}</p>}
    </div>
  );
}
