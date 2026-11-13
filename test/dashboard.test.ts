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

import { dedupeReceipts, priceTrends } from "../src/lib/dashboard";

describe("priceTrends", () => {
  it("ziet of een product duurder of goedkoper werd", () => {
    const t = priceTrends([
      { productId: "kwark", day: "2026-10-01", store: "aldi", unit: 1.49 },
      { productId: "kwark", day: "2026-11-13", store: "aldi", unit: 1.59 },
      { productId: "melk", day: "2026-11-01", store: "aldi", unit: 1.99 },
      { productId: "melk", day: "2026-11-10", store: "jumbo", unit: 1.79 },
      { productId: "brood", day: "2026-11-10", store: "aldi", unit: 2.19 },
    ]);
    const kwark = t.find((x) => x.productId === "kwark")!;
    expect(kwark.change).toBe(0.1);
    expect(kwark.pct).toBe(6.7);
    const melk = t.find((x) => x.productId === "melk")!;
    expect(melk.change).toBe(-0.2);
    expect(melk.cheapest.store).toBe("jumbo");
    expect(t.find((x) => x.productId === "brood")!.points).toBe(1);
    expect(t[t.length - 1].productId).toBe("brood");
  });
});

describe("dedupeReceipts", () => {
  it("telt een dubbel gefotografeerde bon één keer", () => {
    const r = { store_id: "aldi", purchased_on: "2026-11-13", total: 62.43 };
    expect(dedupeReceipts([r, { ...r }, { ...r, total: 6.32 }])).toHaveLength(2);
  });
});
