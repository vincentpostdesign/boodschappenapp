import { describe, expect, it } from "vitest";
import { parseQuantity } from "../src/lib/quantity";

describe("parseQuantity", () => {
  it.each([
    ["2x salade", 2, "salade"],
    ["2 x salade", 2, "salade"],
    ["2X Salade", 2, "Salade"],
    ["2× salade", 2, "salade"],
    ["2xsalade", 2, "salade"],
    ["salade 2x", 2, "salade"],
    ["salade x2", 2, "salade"],
    ["salade x 3", 3, "salade"],
    ["3 appels", 3, "appels"],
    ["  4   bananen ", 4, "bananen"],
  ])("%s → %i × %s", (input, q, name) => {
    expect(parseQuantity(input)).toEqual({ quantity: q, name });
  });

  it.each(["500 gram gehakt", "1,5 l cola", "2 liter melk", "6 stuks eieren", "Pure chocolade 70%", "Appels", "7up", "0x salade"])(
    "%s blijft zoals het is",
    (input) => {
      const r = parseQuantity(input);
      expect(r.quantity === null || input === "0x salade").toBe(true);
      if (input !== "0x salade") expect(r.name).toBe(input);
    },
  );

  it("geen aantal bij 0x", () => {
    expect(parseQuantity("0x salade").quantity).toBeNull();
  });
});
