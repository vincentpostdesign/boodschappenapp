import { describe, expect, it } from "vitest";
import { categoriesForDepartments, isGoodDeal, offerMatchesProduct, offerMatchesWatch } from "../src/lib/prices/match";

const o = (name: string, brand: string | null = null) => ({ name, brand });

describe("offerMatchesProduct", () => {
  it("koppelt een duidelijke treffer", () => {
    expect(offerMatchesProduct(o("Jumbo Magere Kwark 500g"), { name: "Kwark", description: "Magere kwark, 500 ml" })).toBe(true);
    expect(offerMatchesProduct(o("Chiquita bananen"), { name: "Bananen", description: null })).toBe(true);
    expect(offerMatchesProduct(o("Hollandse walnoten 200g"), { name: "Walnoten", description: "Gewoon" })).toBe(true);
  });
  it("is streng bij een omschrijving", () => {
    const caesar = { name: "Salade", description: "Caesar salad" };
    expect(offerMatchesProduct(o("Caesar salade met kip"), caesar)).toBe(true);
    expect(offerMatchesProduct(o("Huzaren salade"), caesar)).toBe(false);
    expect(offerMatchesProduct(o("Volle kwark aardbei"), { name: "Kwark", description: "Magere kwark, 500 ml" })).toBe(false);
  });
  it("weert samengestelde producten en drukke namen", () => {
    expect(offerMatchesProduct(o("Spa Touch bruisend watermelon kiwi", "Spa"), { name: "Kiwi's", description: null })).toBe(false);
    expect(offerMatchesProduct(o("Olvarit 6+ Maanden Perzik Banaan Kiwi 200g"), { name: "Kiwi's", description: null })).toBe(false);
    expect(offerMatchesProduct(o("Zespri Kiwi sungold", "Zespri"), { name: "Kiwi's", description: null })).toBe(true);
    expect(offerMatchesProduct(o("Maggi Ovenschotel zuurkool crème fraîche", "Maggi"), { name: "Crème fraîche", description: "Eigen merk" })).toBe(false);
    expect(offerMatchesProduct(o("Johma Beenham salade", "Johma"), { name: "Salade", description: "Boerensalade" })).toBe(false);
    expect(offerMatchesProduct(o("Johma Boerensalade 175g", "Johma"), { name: "Salade", description: "Boerensalade" })).toBe(true);
  });
  it("gebruikt de categorie van de bron", () => {
    const cats = categoriesForDepartments(["Groente en fruit"]);
    const kiwi = { name: "Kiwi's", description: null };
    expect(offerMatchesProduct({ ...o("Fanta Strawberry kiwi"), category: "frisdrank" }, kiwi, cats)).toBe(false);
    expect(offerMatchesProduct({ ...o("Groene kiwi's"), category: "groente-fruit" }, kiwi, cats)).toBe(true);
    expect(offerMatchesProduct({ ...o("Ella's Kitchen Baby bananen ontbijtje 6+", "Ella's Kitchen"), category: "groente-fruit" }, { name: "Bananen", description: null }, cats)).toBe(false);
    expect(offerMatchesProduct(o("Basmati rijst"), { name: "Rijst", description: null })).toBe(true);
    expect(offerMatchesProduct({ ...o("Ella's Kitchen Bio Bananen + Appels 6 Maanden 120 g"), category: "groente-fruit" }, { name: "Bananen", description: null }, cats)).toBe(false);
    expect(offerMatchesProduct({ ...o("Active O2 Apple kiwi"), category: "groente-fruit" }, kiwi, cats)).toBe(false);
    expect(offerMatchesProduct(o("Mueslirepen 8-pack"), { name: "Muesli", description: null })).toBe(false);
    expect(offerMatchesProduct(o("Blue Band te Gebruiken als Crème Fraîche 175 g", "Blue Band"), { name: "Crème fraîche", description: "Eigen merk" })).toBe(false);
    expect(offerMatchesProduct(o("Optimel Magere kwark vanille", "Optimel"), { name: "Kwark", description: "Magere kwark, 500 ml" })).toBe(false);
    expect(offerMatchesProduct(o("Optimel Drinkyoghurt Framboos 6 x 1000 ml", "Optimel"), { name: "Yoghurt", description: "Optimel, framboos of passievrucht, 1 liter" })).toBe(true);
    expect(offerMatchesProduct(o("Optimel Drinkyoghurt Mango Ananas", "Optimel"), { name: "Yoghurt", description: "Optimel, framboos of passievrucht, 1 liter" })).toBe(false);
  });
  it("koppelt niets als de productnaam ontbreekt", () => {
    expect(offerMatchesProduct(o("Halfvolle yoghurt"), { name: "Melk", description: "Halfvolle melk, 2 liter" })).toBe(false);
  });
});

describe("offerMatchesWatch", () => {
  it("eist het voorkeursmerk", () => {
    const lenor = { name: "Wasmiddelpods", brand: "Lenor" };
    expect(offerMatchesWatch(o("Lenor wasmiddel pods 3in1", "Lenor"), lenor)).toBe(true);
    expect(offerMatchesWatch(o("Ariel wasmiddel pods", "Ariel"), lenor)).toBe(false);
    expect(offerMatchesWatch(o("Lenor wasverzachter", "Lenor"), lenor)).toBe(false);
    expect(offerMatchesWatch(o("Ariel +Pods 4in1 unstoppables touch of lenor", "Ariel"), lenor)).toBe(false);
    expect(offerMatchesWatch(o("Lenor Pods gouden orchidee wasmiddelcapsules", "Lenor"), lenor)).toBe(true);
  });
  it("herkent synoniemen", () => {
    expect(offerMatchesWatch(o("Edet toiletpapier 3-laags 16 rollen"), { name: "Wc-papier", brand: null })).toBe(true);
    expect(offerMatchesWatch(o("Finish vaatwastabletten Quantum"), { name: "Vaatwastabletten", brand: "Finish" })).toBe(true);
    expect(offerMatchesWatch(o("Finish Quantum vaatwascapsules"), { name: "Vaatwastabletten", brand: null })).toBe(true);
    expect(offerMatchesWatch(o("Dreft afwasmiddel original"), { name: "Afwasmiddel", brand: null })).toBe(true);
  });
});

describe("isGoodDeal", () => {
  it("zonder grenzen is elke actie goed", () => {
    expect(isGoodDeal({ price: 9.99, discountPct: null }, { max_price: null, min_discount_pct: null })).toBe(true);
  });
  it("prijsgrens en kortingspercentage moeten allebei kloppen als ze zijn ingesteld", () => {
    const watch = { max_price: 10, min_discount_pct: 30 };
    expect(isGoodDeal({ price: 9.5, discountPct: 35 }, watch)).toBe(true);
    expect(isGoodDeal({ price: 9.5, discountPct: 25 }, watch)).toBe(false);
    expect(isGoodDeal({ price: 11, discountPct: 50 }, watch)).toBe(false);
    expect(isGoodDeal({ price: null, discountPct: 50 }, { max_price: 10, min_discount_pct: null })).toBe(false);
  });
});
