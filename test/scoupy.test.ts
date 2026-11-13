import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dealIdFromLink, dealMatches, isCurrent, parseScoupyHtml, storeList, validAt, type ScoupyDeal } from "../src/lib/scoupy";

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

describe("winkels", () => {
  const ah = { stores: ["Albert Heijn"] } as ScoupyDeal;
  const overal = { stores: ["Albert Heijn", "Jumbo", "ALDI", "Lidl", "PLUS"] } as ScoupyDeal;
  it("weet bij welke winkel een actie geldt", () => {
    expect(validAt(ah, "Albert Heijn")).toBe(true);
    expect(validAt(ah, "Aldi")).toBe(false);
    expect(validAt(overal, "Aldi")).toBe(true);
    expect(validAt(overal, "Plus")).toBe(true);
    expect(validAt({ stores: [] } as unknown as ScoupyDeal, "Aldi")).toBe(true);
  });
  it("noemt de winkels kort", () => {
    expect(storeList(ah)).toBe("AH");
    expect(storeList(overal)).toBe("AH, Jumbo, Aldi, Lidl, Plus");
    expect(storeList({ stores: [] } as unknown as ScoupyDeal)).toBe("alle winkels");
  });
});

describe("dealIdFromLink", () => {
  it("haalt het actienummer uit een gedeelde link", () => {
    expect(dealIdFromLink("https://scoupy.com/nl/geld-terug/optimel/optimel-proteine-extra-drinkyoghurt-van-eur179-voor-eur001/55882/co")).toBe(55882);
    expect(dealIdFromLink("Kijk deze actie! https://scoupy.com/nl-NL/groceries/56012")).toBe(56012);
    expect(dealIdFromLink("https://www.scoupy.nl/nl/geld-terug/x/y/56013/co?utm=1")).toBe(56013);
  });
  it("weigert andere websites en tekst zonder link", () => {
    expect(dealIdFromLink("https://example.com/geld-terug/56012/co")).toBeNull();
    expect(dealIdFromLink("optimel")).toBeNull();
  });
});

describe("isCurrent", () => {
  const d = { starts: "2026-11-11T08:00:00.000Z", ends: "2026-11-12T22:59:59.000Z" } as ScoupyDeal;
  it("loopt binnen de periode, niet erna", () => {
    expect(isCurrent(d, new Date("2026-11-12T10:00:00Z"))).toBe(true);
    expect(isCurrent(d, new Date("2026-11-13T08:00:00Z"))).toBe(false);
  });
});
