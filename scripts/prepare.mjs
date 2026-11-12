// Chuẩn bị tài nguyên: sinh icon PNG từ SVG, chép font vào public/.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const svg = fs.readFileSync(path.join(root, "scripts/icon.svg"));
fs.mkdirSync(path.join(root, "public/icons"), { recursive: true });
for (const n of [16, 32, 48, 128]) {
  await sharp(svg, { density: 384 }).resize(n, n).png().toFile(path.join(root, `public/icons/icon-${n}.png`));
}
fs.copyFileSync(path.join(root, "scripts/icon.svg"), path.join(root, "public/icons/icon.svg"));

// QR ủng hộ: thu nhỏ vừa đủ để quét được, nhẹ để đóng gói.
const qrSrc = path.join(root, "assets/donate-qr-src.jpg");
if (fs.existsSync(qrSrc)) await sharp(qrSrc).resize({ width: 760 }).jpeg({ quality: 90 }).toFile(path.join(root, "public/donate-qr.jpg"));

const fonts = [
  ["@fontsource/be-vietnam-pro", "be-vietnam-pro", ["latin", "vietnamese"], [400, 500, 600]],
  ["@fontsource/source-serif-4", "source-serif-4", ["latin", "vietnamese"], [400, 600]],
];
fs.mkdirSync(path.join(root, "public/fonts"), { recursive: true });
for (const [pkg, name, subsets, weights] of fonts)
  for (const s of subsets) for (const w of weights) {
    const f = `${name}-${s}-${w}-normal.woff2`;
    fs.copyFileSync(path.join(root, "node_modules", pkg, "files", f), path.join(root, "public/fonts", f));
  }
console.log("prepare ok");
