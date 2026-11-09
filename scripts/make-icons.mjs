// Maakt de PWA-iconen uit scripts/icon.svg. Draaien met: node scripts/make-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
const svg = readFileSync(new URL("./icon.svg", import.meta.url));
const out = (n) => new URL(`../public/${n}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(decodeURIComponent(out(name)));
}
// Maskable: extra marge zodat Android er een cirkel van kan maken
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#1f6f4a" } })
  .composite([{ input: await sharp(svg, { density: 300 }).resize(400, 400).png().toBuffer(), gravity: "center" }])
  .png()
  .toFile(decodeURIComponent(out("icon-maskable-512.png")));
console.log("iconen klaar");
