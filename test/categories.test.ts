import { describe, expect, it } from "vitest";
import { departmentForCategory, guessCategory } from "../src/lib/categories";

describe("guessCategory", () => {
  it("deelt veelvoorkomende boodschappen in", () => {
    expect(guessCategory("Appels")).toBe("groente");
    expect(guessCategory("Bananen")).toBe("groente");
    expect(guessCategory("Druiven")).toBe("groente");
    expect(guessCategory("Brood")).toBe("brood");
    expect(guessCategory("Volkorenbrood")).toBe("brood");
    expect(guessCategory("Cola")).toBe("dranken");
    expect(guessCategory("Jus dorange")).toBe("dranken");
    expect(guessCategory("Jus d'orange")).toBe("dranken");
    expect(guessCategory("Kwark")).toBe("zuivel");
    expect(guessCategory("Halfvolle melk")).toBe("zuivel");
    expect(guessCategory("IJsbekers")).toBe("diepvries");
    expect(guessCategory("Afwasmiddel")).toBe("huishouden");
    expect(guessCategory("Pure chocolade 70%")).toBe("zoetwaren");
  });
  it("specifiek gaat voor algemeen", () => {
    expect(guessCategory("Pindakaas")).toBe("ontbijt");
    expect(guessCategory("Kipsalade")).toBe("salades");
    expect(guessCategory("Kipfilet")).toBe("vlees");
    expect(guessCategory("Jonge kaas")).toBe("kaas");
    expect(guessCategory("Ham")).toBe("vleeswaren");
  });
  it("weet het niet bij onbekende namen", () => {
    expect(guessCategory("Cadeautje voor oma")).toBeNull();
  });
});

describe("departmentForCategory", () => {
  const aldi = ["Groente en fruit", "Salades", "Vis", "Vlees", "Brood en zoetwaren", "Koffie", "Thee", "Bier wijn noten en chips", "Vleeswaren kaas en zuivel", "Diepvries", "Overig"].map(
    (name, i) => ({ id: `a${i}`, name }),
  );
  const jumbo = ["Groente en fruit", "Vlees", "Ontbijt", "Brood", "Zoetwaren", "Bier en wijn", "Noten en chips", "Vleeswaren", "Kaas", "Zuivel", "Overig"].map((name, i) => ({ id: `j${i}`, name }));
  const name = (list: { id: string; name: string }[], id: string | null) => list.find((d) => d.id === id)?.name ?? null;

  it("vindt de juiste afdeling per winkel", () => {
    expect(name(aldi, departmentForCategory("zuivel", aldi))).toBe("Vleeswaren kaas en zuivel");
    expect(name(jumbo, departmentForCategory("zuivel", jumbo))).toBe("Zuivel");
    expect(name(aldi, departmentForCategory("vlees", aldi))).toBe("Vlees");
    expect(name(aldi, departmentForCategory("zoetwaren", aldi))).toBe("Brood en zoetwaren");
    expect(name(jumbo, departmentForCategory("zoetwaren", jumbo))).toBe("Zoetwaren");
    expect(name(aldi, departmentForCategory("dranken", aldi))).toBe("Bier wijn noten en chips");
    expect(name(jumbo, departmentForCategory("ontbijt", jumbo))).toBe("Ontbijt");
    expect(name(aldi, departmentForCategory("ontbijt", aldi))).toBe("Brood en zoetwaren");
  });
  it("valt terug op Overig als de winkel zo'n afdeling niet heeft", () => {
    expect(departmentForCategory("huishouden", aldi)).toBeNull();
    expect(departmentForCategory(null, aldi)).toBeNull();
  });
});
