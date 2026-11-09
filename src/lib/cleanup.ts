// Nachtelijke opruiming: afgevinkte regels van vóór vandaag (Nederlandse tijd) gaan naar het archief.
// Archiveren, niet wissen: het dashboard gebruikt de historie.
import { todayNL } from "./dates";

export function itemsToArchive(
  items: { id: string; checked: boolean; checked_at: string | null; archived: boolean }[],
  now: Date = new Date(),
): string[] {
  const today = todayNL(now);
  return items
    .filter((i) => !i.archived && i.checked && i.checked_at && todayNL(new Date(i.checked_at)) < today)
    .map((i) => i.id);
}
