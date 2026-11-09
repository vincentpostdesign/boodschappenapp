// Sorteerlogica: lijstregels groeperen per afdeling in de looproute van een winkel.

export type RouteDepartment = { id: string; name: string; sort_order: number };

export type RouteGroup<T> = { departmentId: string | null; name: string; items: T[] };

const OVERIG = "Overig";

/**
 * Groepeert regels per afdeling, in de volgorde van de looproute.
 * - `departmentOf` geeft per regel de afdeling in deze winkel (of null als onbekend).
 * - Regels zonder (bekende) afdeling komen bij de afdeling "Overig" van de winkel,
 *   of in een losse groep "Overig" achteraan als de winkel die afdeling niet heeft.
 * - Binnen een afdeling op naam (Nederlandse sortering), daarna op toevoegmoment.
 * - Lege afdelingen worden weggelaten.
 */
export function groupByRoute<T extends { name: string; added_at?: string }>(
  items: T[],
  departments: RouteDepartment[],
  departmentOf: (item: T) => string | null | undefined,
): RouteGroup<T>[] {
  const ordered = [...departments].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "nl"));
  const known = new Map(ordered.map((d) => [d.id, d]));
  const overig = ordered.find((d) => d.name.toLowerCase() === OVERIG.toLowerCase()) ?? null;

  const buckets = new Map<string | null, T[]>();
  for (const item of items) {
    const depId = departmentOf(item);
    const key = depId && known.has(depId) ? depId : (overig?.id ?? null);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  const byName = (a: T, b: T) =>
    a.name.localeCompare(b.name, "nl", { sensitivity: "base" }) || (a.added_at ?? "").localeCompare(b.added_at ?? "");

  const groups: RouteGroup<T>[] = [];
  for (const d of ordered) {
    const list = buckets.get(d.id);
    if (list?.length) groups.push({ departmentId: d.id, name: d.name, items: list.sort(byName) });
  }
  const loose = buckets.get(null);
  if (loose?.length) groups.push({ departmentId: null, name: OVERIG, items: loose.sort(byName) });
  return groups;
}

/** Zoekt een vast product bij een vrij ingetypte naam (hoofdletterongevoelig, alleen bij precies één treffer). */
export function matchProduct<P extends { id: string; name: string; description: string | null }>(
  input: string,
  products: P[],
): P | null {
  const q = normalize(input);
  if (!q) return null;
  const full = products.filter((p) => normalize(`${p.name} ${p.description ?? ""}`) === q);
  if (full.length === 1) return full[0];
  const byName = products.filter((p) => normalize(p.name) === q);
  return byName.length === 1 ? byName[0] : null;
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
