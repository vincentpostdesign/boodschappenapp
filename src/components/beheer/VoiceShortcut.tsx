"use client";

import { useState, useTransition } from "react";
import { createVoiceKey, revokeVoiceKey } from "@/app/spraak-actions";
import { IconMic } from "../icons";

/** Beheer → Inspreken met Siri: eigen sleutel maken en uitleg voor de app Opdrachten (widget, Siri, Actieknop). */
export function VoiceShortcut({ hasKey, url }: { hasKey: boolean; url: string }) {
  const [key, setKey] = useState<string | null>(null);
  const [active, setActive] = useState(hasKey);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };
  const make = () =>
    start(async () => {
      setKey(await createVoiceKey());
      setActive(true);
    });
  const revoke = () =>
    start(async () => {
      await revokeVoiceKey();
      setKey(null);
      setActive(false);
    });

  const btn = "h-11 rounded-xl border border-line bg-surface px-3 text-[15px] font-medium";
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <IconMic className="h-5 w-5" />
        </span>
        <p className="text-sm text-muted">
          Boodschappen inspreken zonder de app te openen: met een widget op je beginscherm, <strong className="text-ink">“Hé Siri, boodschappen”</strong> of de Actieknop. Je krijgt een melding met wat er op de lijst is gezet.
        </p>
      </div>

      {key ? (
        <div className="space-y-2 rounded-xl bg-accent-soft/60 p-3">
          <p className="text-sm font-medium">Je sleutel (alleen nu te zien, bewaar hem in de opdracht):</p>
          <code className="block break-all rounded-lg bg-surface px-2 py-1.5 text-sm">{key}</code>
          <button type="button" onClick={() => copy("link", `${url}?sleutel=${key}&tekst=`)} className="h-12 w-full rounded-xl bg-accent px-3 text-[15px] font-semibold text-accent-ink">
            {copied === "link" ? "Link gekopieerd ✓" : "Kopieer link voor de opdracht"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={make} disabled={pending} className="h-11 flex-1 rounded-xl bg-accent px-3 text-[15px] font-semibold text-accent-ink disabled:opacity-50">
            {active ? "Nieuwe sleutel maken" : "Sleutel maken"}
          </button>
          {active && (
            <button type="button" onClick={revoke} disabled={pending} className={`${btn} text-danger`}>
              Intrekken
            </button>
          )}
        </div>
      )}
      {active && !key && <p className="text-xs text-muted">Je hebt al een sleutel. Een nieuwe maken zet de oude uit (pas dan ook je opdracht aan).</p>}

      <details className="text-sm">
        <summary className="cursor-pointer py-1 font-medium text-accent">Zo maak je de opdracht op je iPhone</summary>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-ink">
          <li>
            Maak hierboven je sleutel en tik op <strong>Kopieer link voor de opdracht</strong>.
          </li>
          <li>
            Open de app <strong>Opdrachten</strong> en maak een nieuwe opdracht (de <strong>+</strong> rechtsboven). Tik bovenaan op de naam en noem hem <strong>Boodschappen</strong>.
          </li>
          <li>
            Zoek onderin bij <em>Zoek naar taken</em> naar <strong>Dicteer tekst</strong> en tik erop. Tik in die taak op het pijltje en zet
            <strong> Stop met luisteren</strong> op <strong>Na tik</strong> (anders stopt hij bij de eerste pauze). Taal: <strong>Nederlands</strong>.
          </li>
          <li>
            Zoek <strong>Haal inhoud op van URL</strong> en tik erop. Tik op het blauwe woord <em>URL</em>, plak de link en zet de cursor helemaal achteraan
            (na <code>tekst=</code>). Kies dan boven het toetsenbord de variabele <strong>Gedicteerde tekst</strong>. Verder niets instellen.
          </li>
          <li>
            Zoek <strong>Toon melding</strong> en tik erop. Tik op de tekst en kies de variabele <strong>Inhoud van URL</strong>.
          </li>
          <li>
            Tik op <strong>▶︎</strong> om te testen: spreek in, tik op het scherm als je klaar bent, en je krijgt een melding met wat er op de lijst staat.
          </li>
          <li>
            <strong>Widget:</strong> houd je beginscherm ingedrukt → <strong>Wijzig</strong> → <strong>Voeg widget toe</strong> → Opdrachten → kies Boodschappen.
            Of zeg <strong>“Hé Siri, boodschappen”</strong>, of koppel hem aan de Actieknop (Instellingen → Actieknop → Opdracht).
          </li>
        </ol>
        <p className="mt-2 text-xs text-muted">
          Wat je inspreekt gaat direct op de lijst (Claude maakt er losse regels van en herkent jullie vaste producten), met jouw naam erbij. Zonder internet werkt dit niet; gebruik dan de microfoon in de app.
        </p>
      </details>
    </div>
  );
}
