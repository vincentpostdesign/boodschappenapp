import { SlowLoading } from "@/components/SlowLoading";

// Verschijnt direct bij het wisselen van scherm, terwijl de server de pagina maakt.
export default function Loading() {
  return (
    <>
    <SlowLoading />
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Laden">
      <div className="h-7 w-48 rounded-lg bg-surface-2" />
      <div className="h-12 rounded-2xl bg-surface-2" />
      {[0, 1].map((g) => (
        <div key={g} className="space-y-2">
          <div className="h-3 w-32 rounded bg-surface-2" />
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex h-16 items-center gap-3 px-4">
                <div className="h-6 w-6 rounded-md bg-surface-2" />
                <div className="h-4 flex-1 rounded bg-surface-2" />
                <div className="h-9 w-24 rounded-full bg-surface-2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    </>
  );
}
