import { describe, expect, it } from "vitest";
import { groupByRoute, matchProduct } from "../src/lib/route";
import { cheaperElsewhere } from "../src/lib/prices/cheaper";

const deps = [
  { id: "zuivel", name: "Zuivel", sort_order: 3 },
  { id: "groente", name: "Groente en fruit", sort_order: 1 },
  { id: "brood", name: "Brood", sort_order: 2 },
  { id: "overig", name: "Overig", sort_order: 9 },
];
const item = (name: string, dep: string | null, added_at = "2026-11-09T10:00:00Z") => ({ name, dep, added_at });

describe("groupByRoute", () => {
  it("volgt de looproute en sorteert binnen een afdeling op naam", () => {
    const groups = groupByRoute(
      [item("Melk", "zuivel"), item("Kiwi's", "groente"), item("Bananen", "groente"), item("Brood", "brood")],
      deps,
      (i) => i.dep,
    );
    expect(groups.map((g) => g.name)).toEqual(["Groente en fruit", "Brood", "Zuivel"]);
    expect(groups[0].items.map((i) => i.name)).toEqual(["Bananen", "Kiwi's"]);
  });

  it("zet regels zonder of met onbekende afdeling onder Overig, achteraan", () => {
    const groups = groupByRoute([item("Afwasmiddel", null), item("Iets", "bestaat-niet"), item("Melk", "zuivel")], deps, (i) => i.dep);
    expect(groups.map((g) => g.name)).toEqual(["Zuivel", "Overig"]);
    expect(groups[1].departmentId).toBe("overig");
    expect(groups[1].items).toHaveLength(2);
  });

  it("maakt een losse groep Overig als de winkel die afdeling niet heeft", () => {
    const groups = groupByRoute([item("Afwasmiddel", null)], deps.slice(0, 3), (i) => i.dep);
    expect(groups).toEqual([{ departmentId: null, name: "Overig", items: [expect.objectContaining({ name: "Afwasmiddel" })] }]);
  });

  it("laat lege afdelingen weg", () => {
    expect(groupByRoute([], deps, () => null)).toEqual([]);
  });
});

describe("matchProduct", () => {
  const products = [
    { id: "1", name: "Kwark", description: "Magere kwark, 500 ml" },
    { id: "2", name: "Salade", description: "Caesar salad" },
    { id: "3", name: "Salade", description: "Boerensalade" },
    { id: "4", name: "Crème fraîche", description: "Eigen merk" },
  ];
  it("herkent een unieke naam, ongeacht hoofdletters en accenten", () => {
    expect(matchProduct(" kwark ", products)?.id).toBe("1");
    expect(matchProduct("creme fraiche", products)?.id).toBe("4");
  });
  it("kiest niets bij twijfel", () => {
    expect(matchProduct("salade", products)).toBeNull();
    expect(matchProduct("salade caesar salad", products)?.id).toBe("2");
    expect(matchProduct("afwasmiddel", products)).toBeNull();
  });
});

describe("cheaperElsewhere", () => {
  const names = { aldi: "Aldi", jumbo: "Jumbo", ah: "Albert Heijn" };
  it("toont de goedkoopste andere winkel met het verschil", () => {
    const prices = [
      { product_id: "p", store_id: "aldi", price: 1.99 },
      { product_id: "p", store_id: "jumbo", price: 1.54 },
      { product_id: "p", store_id: "ah", price: 1.89 },
    ];
    expect(cheaperElsewhere("p", "aldi", prices, names)).toEqual({ storeId: "jumbo", storeName: "Jumbo", difference: 0.45 });
  });
  it("toont niets zonder prijs bij de standaardwinkel of als die al het goedkoopst is", () => {
    expect(cheaperElsewhere("p", "aldi", [{ product_id: "p", store_id: "jumbo", price: 1 }], names)).toBeNull();
    expect(
      cheaperElsewhere("p", "aldi", [{ product_id: "p", store_id: "aldi", price: 1 }, { product_id: "p", store_id: "jumbo", price: 1.2 }], names),
    ).toBeNull();
  });
});
