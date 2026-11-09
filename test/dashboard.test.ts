import { describe, expect, it } from "vitest";
import { bucketOf, buckets, frequencies } from "../src/lib/dashboard";

describe("buckets", () => {
  it("maakt maanden terug vanaf vandaag", () => {
    expect(buckets("3m", "2026-11-09").map((b) => b.key)).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(buckets("jaar", "2026-11-09")).toHaveLength(12);
  });
  it("maakt vier weken die op maandag beginnen", () => {
    const b = buckets("4w", "2026-11-09"); // maandag
    expect(b.map((x) => x.key)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"]);
    expect(b[3].label).toBe("wk 46");
  });
  it("plaatst een datum in de juiste emmer", () => {
    const keys = ["2026-09-01", "2026-10-01", "2026-11-01"];
    expect(bucketOf("2026-10-31", keys)).toBe("2026-10-01");
    expect(bucketOf("2026-08-31", keys)).toBeNull();
  });
});

describe("frequencies", () => {
  it("telt per product verschillende dagen en deelt in", () => {
    const p = (day: string, name: string, productId: string | null = null) => ({ day, name, productId });
    const out = frequencies(
      [
        p("2026-09-01", "Melk", "melk"),
        p("2026-09-01", "Melk", "melk"), // zelfde dag telt één keer
        p("2026-09-15", "Melk", "melk"),
        p("2026-09-29", "Melk", "melk"),
        p("2026-10-13", "Melk", "melk"),
        p("2026-10-27", "Melk", "melk"),
        p("2026-11-08", "Melk", "melk"),
        p("2026-10-01", "Afwasmiddel"),
        p("2026-11-01", "afwasmiddel "),
        p("2026-10-05", "Taart"),
      ],
      91,
    );
    expect(out.map((f) => [f.name, f.times, f.kind])).toEqual([
      ["Melk", 6, "vaak"],
      ["Afwasmiddel", 2, "soms"],
      ["Taart", 1, "eenmalig"],
    ]);
    expect(out[1].lastDay).toBe("2026-11-01");
  });
});
