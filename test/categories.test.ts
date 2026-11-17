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
  it("volgt de nieuwe Jumbo-indeling", () => {
    const j2 = ["Groente en fruit", "Salades", "Vis", "Kruiden", "Soepen", "Chips", "Bieren", "Wijnen", "Frisdranken", "Houdbare zuivel", "Koekjes", "Zuivel", "Diepvries", "Brood", "Vleeswaren", "Overig"].map(
      (n, i) => ({ id: `n${i}`, name: n }),
    );
    const dep = (item: string) => name(j2, departmentForCategory(guessCategory(item), j2));
    expect(dep("Opschuimmelk")).toBe("Houdbare zuivel");
    expect(dep("Koffiemelk")).toBe("Houdbare zuivel");
    expect(dep("Halfvolle melk")).toBe("Zuivel");
    expect(dep("Gorgonzola kaas")).toBe("Zuivel");
    expect(dep("Rode wijn")).toBe("Wijnen");
    expect(dep("Hertog Jan pils")).toBe("Bieren");
    expect(dep("Cola")).toBe("Frisdranken");
    expect(dep("Tomatensoep")).toBe("Soepen");
    expect(dep("Kaneel")).toBe("Kruiden");
    expect(dep("Paprikapoeder")).toBe("Kruiden");
    expect(dep("Paprika")).toBe("Groente en fruit");
    expect(dep("Stroopwafels")).toBe("Koekjes");
    expect(dep("Spaghetti")).toBeNull(); // geen houdbaar-afdeling: komt bij Overig
    expect(dep("Kipfilet")).toBe("Vleeswaren");
  });
  it("valt terug op Overig als de winkel zo'n afdeling niet heeft", () => {
    expect(departmentForCategory("huishouden", aldi)).toBeNull();
    expect(departmentForCategory(null, aldi)).toBeNull();
  });
});

describe("Aldi-indeling (17 nov)", () => {
  const aldi = ["Groente en fruit", "Salades", "Vis", "Brood en zoetwaren", "Koffie", "Thee", "Bier, wijn, noten en chips", "Frisdrank",
    "Vlees (bakvlees)", "Vleeswaren", "Kaas", "Zuivel", "Diepvries", "Overig"].map((name) => ({ id: name, name }));
  const dep = (product: string) => departmentForCategory(guessCategory(product), aldi);
  it("zet producten van de bon bij de juiste Aldi-afdeling", () => {
    expect(dep("Boomstam 4st 400g")).toBe("Vlees (bakvlees)");
    expect(dep("Slasch. caesar +sup 0,")).toBe("Salades");
    expect(dep("Gouda 48+ jong bel stuk")).toBe("Kaas");
    expect(dep("Magere kwark")).toBe("Zuivel");
    expect(dep("Opschuimmelk 1L")).toBe("Zuivel");
    expect(dep("Runderrookvlees")).toBe("Vleeswaren");
    expect(dep("Grillworst kaas plakje")).toBe("Vleeswaren");
    expect(dep("Cola regular 2L PET")).toBe("Frisdrank");
    expect(dep("Chips paprika")).toBe("Bier, wijn, noten en chips");
    expect(dep("Roomboter croissants vriezer")).toBe("Diepvries");
  });
});
