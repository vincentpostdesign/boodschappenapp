import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dealMatches, isCurrent, parseScoupyHtml, type ScoupyDeal } from "../src/lib/scoupy";

const html = readFileSync(join(__dirname, "fixtures", "scoupy.html"), "utf8");

describe("parseScoupyHtml", () => {
  const deals = parseScoupyHtml(html);
  it("haalt alleen cashback-acties eruit", () => {
    expect(deals.length).toBeGreaterThan(0);
    expect(deals.every((d) => d.id > 0 && d.title && d.ends)).toBe(true);
  });
  it("leest de Optimel-actie goed", () => {
    const o = deals.find((d) => d.brand === "Optimel")!;
    expect(o.short).toBe("€0,01");
    expect(o.stores).toEqual(["Albert Heijn"]);
    expect(o.ends).toBe("2026-11-12T22:59:59.000Z");
    expect(o.image).toMatch(/^https:\/\/assets\.scoupy\.nl\/464\//);
  });
  it("geeft niets bij onbekende HTML", () => {
    expect(parseScoupyHtml("<html></html>")).toEqual([]);
  });
});

describe("dealMatches", () => {
  const optimel = { brand: "Optimel", product: "Optimel Proteïne Extra Drinkyoghurt 330ml" } as ScoupyDeal;
  it("herkent het merk of het product", () => {
    expect(dealMatches("Optimel", optimel)).toBe(true);
    expect(dealMatches("optimel aardbei", optimel)).toBe(true);
    expect(dealMatches("Drinkyoghurt", optimel)).toBe(true);
  });
  it("geen valse treffers", () => {
    expect(dealMatches("Yoghurt", optimel)).toBe(false);
    expect(dealMatches("Melk", optimel)).toBe(false);
    expect(dealMatches("", optimel)).toBe(false);
  });
});

describe("isCurrent", () => {
  const d = { starts: "2026-11-11T08:00:00.000Z", ends: "2026-11-12T22:59:59.000Z" } as ScoupyDeal;
  it("loopt binnen de periode, niet erna", () => {
    expect(isCurrent(d, new Date("2026-11-12T10:00:00Z"))).toBe(true);
    expect(isCurrent(d, new Date("2026-11-13T08:00:00Z"))).toBe(false);
  });
});
