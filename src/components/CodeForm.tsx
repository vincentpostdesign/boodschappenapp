"use client";

import { useActionState } from "react";
import { changeCode, enterCode, setInitialCode } from "@/app/toegang-actions";

const field =
  "h-14 w-full rounded-2xl border border-line bg-surface px-4 text-center text-2xl tracking-[0.3em] outline-none focus:border-accent";

export function CodeForm({ mode }: { mode: "invoeren" | "instellen" }) {
  const [state, action, pending] = useActionState(mode === "instellen" ? setInitialCode : enterCode, undefined);
  return (
    <form action={action} className="grid gap-3">
      <input
        name="code"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete={mode === "instellen" ? "new-password" : "current-password"}
        aria-label={mode === "instellen" ? "Nieuwe gezinscode" : "Gezinscode"}
        placeholder="••••••"
        required
        autoFocus
        className={field}
      />
      {mode === "instellen" && (
        <input
          name="herhaal"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="new-password"
          aria-label="Herhaal de gezinscode"
          placeholder="nog een keer"
          required
          className={`${field} placeholder:text-base placeholder:tracking-normal`}
        />
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

export function ChangeCodeForm() {
  const [state, action, pending] = useActionState(changeCode, undefined);
  const small = "h-12 w-full rounded-xl border border-line bg-surface px-3 text-[17px] outline-none focus:border-accent";
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <p className="font-medium">Gezinscode wijzigen</p>
      <div className="grid grid-cols-2 gap-3">
        <input name="huidig" type="password" inputMode="numeric" autoComplete="current-password" aria-label="Huidige code" placeholder="Huidige code" required className={small} />
        <input name="code" type="password" inputMode="numeric" autoComplete="new-password" aria-label="Nieuwe code" placeholder="Nieuwe code" required className={small} />
      </div>
      {state?.error && <p role="alert" className="text-sm font-medium text-danger">{state.error}</p>}
      {state && "ok" in state && state.ok && <p role="status" className="text-sm font-medium text-accent">Gewijzigd. Telefoons die al toegang hebben houden die.</p>}
      <button disabled={pending} className="h-11 whitespace-nowrap rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60">
        Wijzigen
      </button>
    </form>
  );
}
