import { describe, expect, it } from "vitest";
import { itemsToArchive } from "../src/lib/cleanup";

const item = (id: string, checked: boolean, checked_at: string | null, archived = false) => ({ id, checked, checked_at, archived });

describe("itemsToArchive", () => {
  // 10 november 2026, 03:00 Nederlandse tijd (02:00 UTC)
  const now = new Date("2026-11-10T02:00:00Z");

  it("archiveert alleen afgevinkte regels van eerdere dagen", () => {
    const ids = itemsToArchive(
      [
        item("gisteren", true, "2026-11-09T18:00:00Z"),
        item("open", false, null),
        item("vannacht", true, "2026-11-10T00:30:00Z"), // 01:30 NL: vandaag, blijft staan
        item("al-gearchiveerd", true, "2026-11-01T10:00:00Z", true),
      ],
      now,
    );
    expect(ids).toEqual(["gisteren"]);
  });

  it("rekent in Nederlandse tijd: 23:30 UTC is in Nederland al de volgende dag", () => {
    // 9 nov 23:30 UTC = 10 nov 00:30 NL → vandaag
    expect(itemsToArchive([item("laat", true, "2026-11-09T23:30:00Z")], now)).toEqual([]);
  });
});
