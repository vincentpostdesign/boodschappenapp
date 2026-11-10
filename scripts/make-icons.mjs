// Maakt de PWA-iconen uit scripts/icon.svg en public/favicon.svg. Draaien met: node scripts/make-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const p = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const icon = readFileSync(p("./icon.svg"));
const fav = readFileSync(p("../public/favicon.svg"));
const render = (svg, size) => sharp(svg, { density: 400 }).resize(size, size).png();
// iOS rondt zelf af; Android-maskable krijgt extra marge (veilige zone 80%)
await render(icon, 180).toFile(p("../public/apple-touch-icon.png"));
await render(icon, 192).toFile(p("../public/icon-192.png"));
await render(icon, 512).toFile(p("../public/icon-512.png"));
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#1f6f4a" } })
  .composite([{ input: await render(icon, 410).toBuffer(), gravity: "center" }])
  .png()
  .toFile(p("../public/icon-maskable-512.png"));
await render(fav, 32).toFile(p("../public/favicon-32.png"));
await 
console.log("iconen klaar");
