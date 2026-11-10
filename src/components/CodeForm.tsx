"use client";

import { useActionState } from "react";
import { changeOwnCode, enterCode, setCodeFor, setInitialCode } from "@/app/toegang-actions";

const field =
  "h-14 w-full rounded-2xl border border-line bg-surface px-4 text-center text-2xl tracking-[0.3em] outline-none focus:border-accent";
const small = "h-12 w-full rounded-xl border border-line bg-surface px-3 text-[17px] outline-none focus:border-accent";

function CodeInput({ name, label, placeholder = "••••••", autoFocus, isNew, className = field }: { name: string; label: string; placeholder?: string; autoFocus?: boolean; isNew?: boolean; className?: string }) {
  return (
    <input
      name={name}
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete={isNew ? "new-password" : "current-password"}
      aria-label={label}
      placeholder={placeholder}
      required
      autoFocus={autoFocus}
      className={className}
    />
  );
}

/** Inloggen met je eigen code (of, allereerste keer, je code kiezen). */
export function CodeForm({ mode }: { mode: "invoeren" | "instellen" }) {
  const [state, action, pending] = useActionState(mode === "instellen" ? setInitialCode : enterCode, undefined);
  return (
    <form action={action} className="grid gap-3">
      {mode === "instellen" && (
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-sm font-medium text-muted">Wie ben jij?</legend>
          {(["vincent", "marleen"] as const).map((p) => (
            <label key={p} className="flex h-14 cursor-pointer items-center justify-center rounded-2xl border border-line bg-surface font-semibold has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent">
              <input type="radio" name="person" value={p} required className="sr-only" />
              {p === "vincent" ? "Vincent" : "Marleen"}
            </label>
          ))}
        </fieldset>
      )}
      <CodeInput name="code" label={mode === "instellen" ? "Kies je code" : "Je code"} autoFocus={mode === "invoeren"} isNew={mode === "instellen"} />
      {mode === "instellen" && (
        <CodeInput name="herhaal" label="Herhaal je code" placeholder="nog een keer" isNew className={`${field} placeholder:text-base placeholder:tracking-normal`} />
      )}
      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="h-14 rounded-2xl bg-accent text-[16px] font-semibold text-accent-ink disabled:opacity-60">
        {pending ? "Even geduld…" : mode === "instellen" ? "Code instellen" : "Verder"}
      </button>
    </form>
  );
}

/** Beheer: eigen code wijzigen. */
export function ChangeCodeForm() {
  const [state, action, pending] = useActionState(changeOwnCode, undefined);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <p className="font-medium">Mijn code wijzigen</p>
      <div className="grid grid-cols-2 gap-3">
        <CodeInput name="huidig" label="Huidige code" placeholder="Huidige code" className={small} />
        <CodeInput name="code" label="Nieuwe code" placeholder="Nieuwe code" isNew className={small} />
      </div>
      {state?.error && <p role="alert" className="text-sm font-medium text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm font-medium text-accent">Gewijzigd. Telefoons die al ingelogd zijn blijven dat.</p>}
      <button disabled={pending} className="h-11 whitespace-nowrap rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60">
        Wijzigen
      </button>
    </form>
  );
}

/** Beheer: eerste code instellen voor iemand die er nog geen heeft. */
export function SetCodeForForm({ person, name }: { person: "vincent" | "marleen"; name: string }) {
  const [state, action, pending] = useActionState(setCodeFor, undefined);
  if (state?.ok) {
    return (
      <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
        Code voor {name} ingesteld. Geef hem door; {name} logt daarmee in en is dan meteen herkend.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-dashed border-accent/50 bg-surface p-4">
      <input type="hidden" name="person" value={person} />
      <p className="font-medium">Code voor {name} instellen</p>
      <p className="text-sm text-muted">{name} heeft nog geen eigen code. Kies er een en geef hem door; {name} kan hem daarna zelf wijzigen.</p>
      <CodeInput name="code" label={`Code voor ${name}`} placeholder="Code (cijfers)" isNew className={small} />
      {state?.error && <p role="alert" className="text-sm font-medium text-danger">{state.error}</p>}
      <button disabled={pending} className="h-11 whitespace-nowrap rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60">
        Instellen
      </button>
    </form>
  );
}
