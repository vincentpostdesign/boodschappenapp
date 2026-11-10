// Vast weekrooster: per weekdag wie de boodschappen doet. 0 = maandag … 6 = zondag.
import type { PersonId } from "./types";

export const WEEKDAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"] as const;

export type WeekSchedule = (PersonId | null)[]; // altijd 7 plaatsen

export function emptySchedule(): WeekSchedule {
  return [null, null, null, null, null, null, null];
}

/** Weekdag van een datum 'YYYY-MM-DD' (maandag = 0). */
export function weekdayIndex(day: string): number {
  const d = new Date(`${day}T12:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

/** Leest het opgeslagen rooster veilig in (ontbrekende of onbekende waarden worden null). */
export function parseSchedule(value: unknown): WeekSchedule {
  const out = emptySchedule();
  if (!Array.isArray(value)) return out;
  for (let i = 0; i < 7; i++) out[i] = value[i] === "vincent" || value[i] === "marleen" ? value[i] : null;
  return out;
}

/** Eerste rooster afleiden uit losse datums die al waren ingevuld (de eerstvolgende datum per weekdag telt). */
export function scheduleFromDays(rows: { day: string; person_id: string }[]): WeekSchedule {
  const out = emptySchedule();
  const seen = new Set<number>();
  for (const r of [...rows].sort((a, b) => a.day.localeCompare(b.day))) {
    const i = weekdayIndex(r.day);
    if (seen.has(i)) continue;
    seen.add(i);
    out[i] = r.person_id === "vincent" || r.person_id === "marleen" ? r.person_id : null;
  }
  return out;
}

export function shopperOn(schedule: WeekSchedule, day: string): PersonId | null {
  return schedule[weekdayIndex(day)] ?? null;
}
