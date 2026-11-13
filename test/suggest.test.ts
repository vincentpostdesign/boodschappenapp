import { describe, expect, it } from "vitest";
import { suggestProduct } from "../src/lib/receipt";

const products = [
  { id: "kwark", name: "Kwark", description: "Magere kwark, 500 ml" },
  { id: "melk", name: "Melk", description: "Halfvolle melk, 2 liter" },
  { id: "bananen", name: "Bananen", description: null },
  { id: "cola", name: "Cola", description: null },
  { id: "salade1", name: "Salade", description: "Boerensalade" },
  { id: "salade2", name: "Salade", description: "Caesar salad" },
  { id: "kiwi", name: "Kiwi's", description: null },
];

describe("suggestProduct", () => {
  it("koppelt bonnamen aan het vaste product", () => {
    expect(suggestProduct("Magere kwark", products)).toBe("kwark");
    expect(suggestProduct("Halfv melk 2L", products)).toBe("melk");
    expect(suggestProduct("Banaan", products)).toBe("bananen");
    expect(suggestProduct("Cola regular 2L PET", products)).toBe("cola");
    expect(suggestProduct("Kiwi", products)).toBe("kiwi");
  });
  it("kiest bij twijfel de omschrijving, en anders niets", () => {
    expect(suggestProduct("Boerensalade", products)).toBeNull(); // naam 'salade' staat er niet los in
    expect(suggestProduct("Salade boerensalade", products)).toBe("salade1");
    expect(suggestProduct("Salade", products)).toBeNull(); // twee gelijke kandidaten
  });
  it("koppelt niets als het niet past", () => {
    expect(suggestProduct("Drinkyoghurt framboos", products)).toBeNull();
    expect(suggestProduct("+Petfles statiegeld", products)).toBeNull();
  });
});
