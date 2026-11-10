import { beforeAll, describe, expect, it } from "vitest";
import { createAccessToken, validCode, verifyAccessToken } from "../src/lib/access";

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-sleutel";
});

describe("toegangsbewijs", () => {
  it("accepteert een eigen bewijs", async () => {
    expect(await verifyAccessToken(await createAccessToken())).toBe(true);
  });
  it("weigert vervalste, verlopen en lege bewijzen", async () => {
    const token = await createAccessToken();
    const [exp, sig] = token.split(".");
    expect(await verifyAccessToken(`${Number(exp) + 1000}.${sig}`)).toBe(false); // langere geldigheid verzonnen
    expect(await verifyAccessToken(`${exp}.${"0".repeat(64)}`)).toBe(false);
    expect(await verifyAccessToken(await createAccessToken(Date.now() - 500 * 86400_000))).toBe(false);
    expect(await verifyAccessToken(undefined)).toBe(false);
    expect(await verifyAccessToken("onzin")).toBe(false);
  });
  it("weigert een bewijs gemaakt met een andere sleutel", async () => {
    const token = await createAccessToken();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "andere-sleutel";
    expect(await verifyAccessToken(token)).toBe(false);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-sleutel";
  });
});

describe("validCode", () => {
  it("alleen 4 tot 12 cijfers", () => {
    expect(validCode("1234")).toBe(true);
    expect(validCode("123456789012")).toBe(true);
    expect(validCode("123")).toBe(false);
    expect(validCode("12a4")).toBe(false);
    expect(validCode("1234567890123")).toBe(false);
  });
});
