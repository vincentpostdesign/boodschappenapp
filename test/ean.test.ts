import { describe, expect, it } from "vitest";
import { validEan } from "../src/lib/ean";

describe("validEan", () => {
  it("accepteert geldige codes", () => {
    expect(validEan("5449000000996")).toBe(true); // Coca-Cola 33 cl
    expect(validEan("8713326030089")).toBe(true);
    expect(validEan("96385074")).toBe(true); // EAN-8
    expect(validEan("036000291452")).toBe(true); // UPC-A
  });
  it("weigert een verkeerd gelezen cijfer of verkeerde lengte", () => {
    expect(validEan("5449000000997")).toBe(false);
    expect(validEan("544900000099")).toBe(false);
    expect(validEan("abc")).toBe(false);
  });
});
