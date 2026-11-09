const TZ = "Europe/Amsterdam";

/** Datum van vandaag in Nederland als 'YYYY-MM-DD'. */
export function todayNL(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 'maandag 9 november' */
export function longDate(day: string): string {
  return new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}

/** Korte datum voor een lijstregel: 'vandaag', 'gisteren' of '7 nov'. */
export function shortDate(iso: string, now: Date = new Date()): string {
  const day = todayNL(new Date(iso));
  const today = todayNL(now);
  if (day === today) return "vandaag";
  if (day === addDays(today, -1)) return "gisteren";
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso)).replace(".", "");
}

export function euro(n: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}
