// Eenvoudige, toegankelijke grafieken zonder bibliotheek. Eén reeks = één kleur (--chart), tekst in de tekstkleuren.
import { euro } from "@/lib/dates";

export function BarList({ rows, label }: { rows: { name: string; value: number; sub?: string }[]; label: string }) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  return (
    <figure className="space-y-3" aria-label={label}>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.name} className="group relative">
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{r.name}</span>
              <span className="tabular-nums text-muted">
                <strong className="font-semibold text-ink">{euro(r.value)}</strong>
                {r.sub ? ` · ${r.sub}` : ""}
              </span>
            </div>
            {/* Balk: 8px hoog, data-einde afgerond (4px), vast aan de basislijn */}
            <div className="h-2 w-full bg-surface-2">
              <div
                className="h-2 rounded-r-[4px] bg-chart transition-[width]"
                style={{ width: max ? `${Math.max(1.5, (r.value / max) * 100)}%` : 0 }}
                title={`${r.name}: ${euro(r.value)}`}
              />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function Columns({ cols, label }: { cols: { key: string; label: string; value: number; count: number }[]; label: string }) {
  const max = Math.max(...cols.map((c) => c.value), 0);
  const peak = cols.reduce<(typeof cols)[number] | null>((p, c) => (!p || c.value > p.value ? c : p), null);
  return (
    <figure aria-label={label} className="space-y-2">
      <div className="relative flex h-40 items-end gap-[2px] border-b border-line" role="list">
        {cols.map((c) => (
          <div key={c.key} role="listitem" className="group relative flex h-full flex-1 flex-col items-center justify-end">
            {/* Tooltip bij aanwijzen of aantikken; het raakvlak is de hele kolomhoogte */}
            <span className="pointer-events-none absolute -top-1 z-10 hidden -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-xs shadow-sm group-hover:block group-focus-within:block">
              <strong className="tabular-nums">{euro(c.value)}</strong> · {c.count} {c.count === 1 ? "bon" : "bonnen"}
            </span>
            {/* Alleen de hoogste kolom krijgt een direct label */}
            {peak && c.key === peak.key && c.value > 0 && <span className="mb-1 text-[11px] font-semibold tabular-nums text-ink">{euro(c.value)}</span>}
            <button
              type="button"
              aria-label={`${c.label}: ${euro(c.value)}`}
              className="w-full max-w-10 rounded-t-[4px] bg-chart outline-offset-2"
              style={{ height: max ? `${Math.max(c.value > 0 ? 2 : 0, (c.value / max) * 85)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-[2px]">
        {cols.map((c) => (
          <span key={c.key} className="flex-1 text-center text-[11px] text-muted">{c.label}</span>
        ))}
      </div>
    </figure>
  );
}
