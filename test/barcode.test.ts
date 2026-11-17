import { describe, expect, it } from "vitest";
import { encodeCode128, encodeEan, isValidEan, pickFormat } from "../src/lib/barcode";

describe("EAN", () => {
  it("controleert het controlecijfer", () => {
    expect(isValidEan("4006381333931")).toBe(true);
    expect(isValidEan("4006381333932")).toBe(false);
    expect(isValidEan("96385074")).toBe(true);
  });
  it("tekent EAN-13 met 95 modules en de juiste eerste helft", () => {
    const m = encodeEan("4006381333931");
    expect(m).toHaveLength(95);
    expect(m.startsWith("101")).toBe(true);
    expect(m.endsWith("101")).toBe(true);
    expect(m.slice(45, 50)).toBe("01010");
    // Eerste cijfer 4 → pariteit LGLLGG; cijfer 0 in L = 0001101
    expect(m.slice(3, 10)).toBe("0001101");
  });
  it("tekent EAN-8 met 67 modules", () => {
    expect(encodeEan("96385074")).toHaveLength(67);
  });
});

describe("Code 128", () => {
  it("gebruikt set C voor een even aantal cijfers", () => {
    // Start C (105) = 211232 → 11 modules beginnend met '11'
    const m = encodeCode128("123456");
    expect(m.startsWith("11010011100")).toBe(true);
    expect(m.endsWith("1100011101011")).toBe(true); // stopteken
  });
  it("gebruikt set B voor letters", () => {
    expect(encodeCode128("AH1").startsWith("11010010000")).toBe(true); // start B
  });
});

describe("pickFormat", () => {
  it("kiest EAN bij een geldige EAN, anders Code 128", () => {
    expect(pickFormat("4006381333931")).toBe("ean13");
    expect(pickFormat("1234567890")).toBe("code128");
  });
});
