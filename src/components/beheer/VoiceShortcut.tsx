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
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => copy("adres", url)} className={btn}>
              {copied === "adres" ? "Gekopieerd ✓" : "Kopieer adres"}
            </button>
            <button type="button" onClick={() => copy("sleutel", `Bearer ${key}`)} className={btn}>
              {copied === "sleutel" ? "Gekopieerd ✓" : "Kopieer sleutel"}
            </button>
          </div>
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
          <li>Maak hierboven je sleutel en houd dit scherm open.</li>
          <li>
            Open de app <strong>Opdrachten</strong> → tik op <strong>+</strong>. Noem de opdracht <strong>Boodschappen</strong>.
          </li>
          <li>
            Voeg de taak <strong>Dicteer tekst</strong> toe. Zet de taal op <strong>Nederlands</strong>.
          </li>
          <li>
            Voeg <strong>Haal inhoud op van URL</strong> toe. Plak bij URL het adres (<em>Kopieer adres</em>). Tik op het pijltje (Toon meer):
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Methode: <strong>POST</strong></li>
              <li>
                Headers → <strong>Voeg nieuwe header toe</strong>: sleutel <code>Authorization</code>, waarde: plak <em>Kopieer sleutel</em> (begint met <code>Bearer</code>)
              </li>
              <li>
                Hoofdtekst verzoek: <strong>JSON</strong> → <strong>Voeg nieuw veld toe</strong> → Tekst: sleutel <code>tekst</code>, waarde: kies de variabele <strong>Gedicteerde tekst</strong>
              </li>
            </ul>
          </li>
          <li>
            Voeg <strong>Toon melding</strong> toe en kies als tekst <strong>Inhoud van URL</strong>.
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
