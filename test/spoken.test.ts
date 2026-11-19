import { describe, expect, it } from "vitest";
import { asLine, splitSpoken } from "../src/lib/spoken";

describe("splitSpoken", () => {
  it("splitst op komma's en 'en', met telwoorden", () => {
    expect(splitSpoken("twee pakken melk, kaas en drie appels")).toEqual([
      { name: "Melk", quantity: 2 },
      { name: "Kaas", quantity: 1 },
      { name: "Appels", quantity: 3 },
    ]);
  });
  it("laat opvulwoorden weg", () => {
    expect(splitSpoken("we hebben nog brood nodig en ook pindakaas").map((s) => s.name)).toEqual(["Brood", "Pindakaas"]);
  });
  it("cijfers en gewichten", () => {
    expect(splitSpoken("2 bananen, 500 gram gehakt")).toEqual([
      { name: "Bananen", quantity: 2 },
      { name: "500 gram gehakt", quantity: 1 },
    ]);
  });
  it("regeltekst", () => {
    expect(asLine({ name: "Melk", quantity: 2 })).toBe("2x Melk");
    expect(asLine({ name: "Kaas", quantity: 1 })).toBe("Kaas");
  });
});
