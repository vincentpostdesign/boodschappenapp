import { describe, expect, it } from "vitest";
import { cleanLines, niceCase } from "../src/lib/receipt";

describe("niceCase", () => {
  it("zet alleen-hoofdletters om naar gewone schrijfwijze", () => {
    expect(niceCase("HALFV MELK 2L")).toBe("Halfv melk 2L");
    expect(niceCase("KWARK MAGER")).toBe("Kwark mager");
    expect(niceCase("ÉÉN BROOD 500G")).toBe("Één brood 500g");
  });
  it("laat namen met kleine letters en zonder letters ongemoeid", () => {
    expect(niceCase("AH pindakaas")).toBe("AH pindakaas");
    expect(niceCase("Coca Cola zero")).toBe("Coca Cola zero");
    expect(niceCase("1234")).toBe("1234");
  });
  it("wordt toegepast bij het opschonen van bonregels", () => {
    expect(cleanLines([{ naam: "SALADE  MIX", aantal: 1, prijs: 1.29 }])[0].raw_name).toBe("Salade mix");
  });
});
