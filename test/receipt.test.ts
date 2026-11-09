import { describe, expect, it } from "vitest";
import { applyAliases, checkTotal, cleanLines, unitPrice } from "../src/lib/receipt";

describe("cleanLines", () => {
  it("haalt totaal-, btw- en betaalregels weg en rondt af", () => {
    const lines = cleanLines([
      { naam: "HALFV MELK 2L", aantal: 1, prijs: 1.99 },
      { naam: "  KWARK  MAGER ", aantal: 2, prijs: 2.5800001 },
      { naam: "SUBTOTAAL", aantal: 1, prijs: 4.57 },
      { naam: "Totaal", aantal: 1, prijs: 4.57 },
      { naam: "BTW 9%", aantal: 1, prijs: 0.38 },
      { naam: "PIN", aantal: 1, prijs: 4.57 },
      { naam: "", aantal: 1, prijs: 1 },
    ]);
    expect(lines).toEqual([
      { raw_name: "HALFV MELK 2L", quantity: 1, price: 1.99 },
      { raw_name: "KWARK MAGER", quantity: 2, price: 2.58 },
    ]);
  });
  it("houdt kortingsregels (negatief) en herstelt een ongeldig aantal", () => {
    expect(cleanLines([{ naam: "KORTING", aantal: 0, prijs: -0.5 }])).toEqual([{ raw_name: "KORTING", quantity: 1, price: -0.5 }]);
  });
  it("laat onzinbedragen weg", () => {
    expect(cleanLines([{ naam: "X", aantal: 1, prijs: Number.NaN }, { naam: "Y", aantal: 1, prijs: 12345 }])).toEqual([]);
  });
});

describe("checkTotal", () => {
  it("vergelijkt de som met het totaal", () => {
    expect(checkTotal([{ price: 1.99 }, { price: 2.58 }, { price: -0.5 }], 4.07)).toEqual({ sum: 4.07, matches: true, difference: 0 });
    expect(checkTotal([{ price: 1.99 }], 3.99)).toEqual({ sum: 1.99, matches: false, difference: 2 });
    expect(checkTotal([{ price: 1 }], null)).toEqual({ sum: 1, matches: null, difference: null });
  });
});

describe("unitPrice", () => {
  it("rekent per stuk en slaat korting over", () => {
    expect(unitPrice({ quantity: 2, price: 2.58 })).toBe(1.29);
    expect(unitPrice({ quantity: 1, price: -0.5 })).toBeNull();
  });
});

describe("applyAliases", () => {
  it("koppelt bonnamen aan vaste producten, ongeacht hoofdletters en spaties", () => {
    const out = applyAliases([{ raw_name: "HALFV  MELK 2L" }, { raw_name: "ONBEKEND" }], [{ alias: "halfv melk 2l", product_id: "melk" }]);
    expect(out.map((l) => l.product_id)).toEqual(["melk", null]);
  });
});
