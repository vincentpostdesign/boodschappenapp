// Barcodes zelf tekenen (geen internet of andere app nodig): EAN-13/EAN-8 en Code 128.
// Uitkomst is een rij van 0/1-modules (1 = zwarte streep van één module breed).

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

/** Controlecijfer voor EAN-13 (12 cijfers in) of EAN-8 (7 cijfers in). */
export function eanCheckDigit(body: string): number {
  const d = body.split("").map(Number).reverse();
  const sum = d.reduce((s, x, i) => s + x * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

export function isValidEan(code: string): boolean {
  if (!/^(\d{8}|\d{13})$/.test(code)) return false;
  return eanCheckDigit(code.slice(0, -1)) === Number(code.at(-1));
}

/** EAN-13 of EAN-8 als modules (inclusief begin-, midden- en eindteken). */
export function encodeEan(code: string): string {
  if (!isValidEan(code)) throw new Error("Geen geldige EAN-code");
  if (code.length === 8) {
    const left = code.slice(0, 4).split("").map((c) => L[+c]).join("");
    const right = code.slice(4).split("").map((c) => R[+c]).join("");
    return `101${left}01010${right}101`;
  }
  const parity = PARITY[+code[0]];
  const left = code
    .slice(1, 7)
    .split("")
    .map((c, i) => (parity[i] === "L" ? L : G)[+c])
    .join("");
  const right = code.slice(7).split("").map((c) => R[+c]).join("");
  return `101${left}01010${right}101`;
}

// Code 128: streep/spatie-breedtes per waarde 0..106 (106 = stop, met extra streep).
const C128 = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

function widthsToModules(w: string): string {
  return w
    .split("")
    .map((n, i) => (i % 2 === 0 ? "1" : "0").repeat(+n))
    .join("");
}

/**
 * Code 128. Alleen cijfers (even aantal) → set C (compact), anders set B (letters, cijfers, leestekens).
 */
export function encodeCode128(text: string): string {
  if (!text || /[^\x20-\x7e]/.test(text)) throw new Error("Alleen gewone tekens");
  const values: number[] = [];
  if (/^\d+$/.test(text) && text.length % 2 === 0) {
    values.push(105); // start C
    for (let i = 0; i < text.length; i += 2) values.push(Number(text.slice(i, i + 2)));
  } else {
    values.push(104); // start B
    for (const ch of text) values.push(ch.charCodeAt(0) - 32);
  }
  const check = values.reduce((s, v, i) => s + v * (i === 0 ? 1 : i), 0) % 103;
  return [...values, check, 106].map((v) => widthsToModules(C128[v])).join("");
}

export type BarcodeFormat = "ean13" | "code128" | "qr";

/** Kies het formaat: geldige EAN-13/EAN-8 → EAN, anders Code 128. (QR kies je zelf: Lidl, IKEA, HEMA.) */
export function pickFormat(number: string): BarcodeFormat {
  return isValidEan(number) ? "ean13" : "code128";
}

/** Streepjescode als modules (niet voor QR; die tekent encodeQr). */
export function encode(number: string, format: BarcodeFormat): string {
  if (format === "qr") return encodeQr(number).map((r) => r.join("")).join("");
  return format === "ean13" ? encodeEan(number) : encodeCode128(number);
}

/** QR-code als raster van 0/1 (foutcorrectie M). */
export function encodeQr(text: string): ("0" | "1")[][] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const qrcode = require("qrcode-generator") as (t: number, l: string) => {
    addData: (d: string) => void;
    make: () => void;
    getModuleCount: () => number;
    isDark: (r: number, c: number) => boolean;
  };
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (q.isDark(r, c) ? "1" : "0")));
}
