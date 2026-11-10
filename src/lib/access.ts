// Toegangsbewijs voor de gezinscode. Werkt in de middleware (Web Crypto) én op de server.
// Cookie 'toegang' = "<verloopt-ms>.<hmac>"; de HMAC-sleutel is afgeleid van de server-sleutel, dus niet te vervalsen.

export const ACCESS_COOKIE = "toegang";
export const ACCESS_DAYS = 400;

async function key(): Promise<CryptoKey> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(`toegang:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string) => new Uint8Array((hex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)));

export async function createAccessToken(now = Date.now()): Promise<string> {
  const expires = String(now + ACCESS_DAYS * 86400_000);
  const sig = await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(expires));
  return `${expires}.${toHex(sig)}`;
}

export async function verifyAccessToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig || !/^\d+$/.test(expires) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  if (Number(expires) < now) return false;
  return crypto.subtle.verify("HMAC", await key(), fromHex(sig), new TextEncoder().encode(expires));
}

/** Gezinscode: alleen cijfers, 4 tot 12 lang. */
export function validCode(code: string): boolean {
  return /^\d{4,12}$/.test(code);
}
