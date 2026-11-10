import { describe, expect, it } from "vitest";
import { parseSchedule, scheduleFromDays, shopperOn, weekdayIndex } from "../src/lib/schedule";

describe("weekrooster", () => {
  it("rekent maandag als dag 0 en zondag als 6", () => {
    expect(weekdayIndex("2026-11-09")).toBe(0); // maandag
    expect(weekdayIndex("2026-11-10")).toBe(1); // dinsdag
    expect(weekdayIndex("2026-11-15")).toBe(6); // zondag
  });

  it("leest een opgeslagen rooster veilig in", () => {
    expect(parseSchedule(["vincent", null, "marleen"])).toEqual(["vincent", null, "marleen", null, null, null, null]);
    expect(parseSchedule(["iemand", 3])).toEqual([null, null, null, null, null, null, null]);
    expect(parseSchedule(null)).toHaveLength(7);
  });

  it("neemt eerder ingevulde datums over, de eerstvolgende per weekdag", () => {
    const s = scheduleFromDays([
      { day: "2026-11-17", person_id: "marleen" }, // dinsdag volgende week
      { day: "2026-11-10", person_id: "vincent" }, // dinsdag (eerder) wint
      { day: "2026-11-14", person_id: "marleen" }, // zaterdag
    ]);
    expect(s[1]).toBe("vincent");
    expect(s[5]).toBe("marleen");
    expect(s.filter(Boolean)).toHaveLength(2);
  });

  it("geldt elke week opnieuw", () => {
    const s = parseSchedule([null, "vincent", null, null, null, "marleen", null]);
    expect(shopperOn(s, "2026-11-10")).toBe("vincent");
    expect(shopperOn(s, "2026-11-17")).toBe("vincent");
    expect(shopperOn(s, "2026-11-21")).toBe("marleen");
    expect(shopperOn(s, "2026-11-11")).toBeNull();
  });
});
