// Offline checks for the sample catalog and its image files. Touches no database.
// Usage: node scripts/seed-catalog/validate.mjs [--require-images]
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { catalog, productId, imageFile, storagePath } from "./build.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imgDir = join(root, "seed-assets/product-images");
const errors = [];
const err = (m) => errors.push(m);
const P = catalog.products;

const WANT = { "carpets-rugs": 5, "dried-fruits-nuts": 4, "saffron-spices": 4, "jewelry-handicrafts": 5, "traditional-clothing": 4, "home-decoration": 4, other: 4 };
const uniq = (arr, what) => { if (new Set(arr).size !== arr.length) err(`duplicate ${what}`); };

if (P.length !== 30) err(`expected 30 products, found ${P.length}`);
uniq(P.map(productId), "product id");
uniq(P.map((p) => p.name.toLowerCase()), "product name");
uniq(P.map(imageFile), "image file name");
uniq(P.map((p) => p.slug), "slug");
const counts = {};
for (const p of P) {
  counts[p.category] = (counts[p.category] ?? 0) + 1;
  if (!(p.category in WANT)) err(`${p.name}: unknown category ${p.category}`);
  if (!["Afghanistan", "India"].includes(p.origin)) err(`${p.name}: bad origin`);
  if (p.currency !== (p.origin === "Afghanistan" ? "AFN" : "INR")) err(`${p.name}: currency ${p.currency} does not match origin ${p.origin}`);
  if (!(p.price >= 0) || !Number.isInteger(p.stock) || p.stock <= 0 || !(p.weight > 0)) err(`${p.name}: price/stock/weight invalid`);
  if (!p.description || p.description.length > 220) err(`${p.name}: description missing or too long`);
}
for (const [c, n] of Object.entries(WANT)) if (counts[c] !== n) err(`category ${c}: expected ${n}, found ${counts[c] ?? 0}`);

function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

let present = 0;
const hashes = new Map();
for (const p of P) {
  const f = join(imgDir, imageFile(p));
  if (!existsSync(f)) continue;
  present++;
  const buf = readFileSync(f);
  const s = jpegSize(buf);
  if (!s) { err(`${imageFile(p)}: not a valid JPEG`); continue; }
  if (s.w !== s.h) err(`${imageFile(p)}: ${s.w}x${s.h} is not square`);
  if (Math.min(s.w, s.h) < 1024) err(`${imageFile(p)}: smaller than 1024 px`);
  if (buf.length > 5 * 1024 * 1024) err(`${imageFile(p)}: larger than 5 MB`);
  const h = createHash("sha256").update(buf).digest("hex");
  if (hashes.has(h)) err(`${imageFile(p)} is byte-identical to ${hashes.get(h)}`);
  hashes.set(h, imageFile(p));
}
const missing = P.length - present;
if (missing && process.argv.includes("--require-images")) err(`${missing} of ${P.length} image files are missing`);

console.log(`products: ${P.length}, unique ids/names/files OK: ${errors.length === 0}`);
console.log(`category counts: ${JSON.stringify(counts)}`);
console.log(`origins: AF=${P.filter((p) => p.origin === "Afghanistan").length} IN=${P.filter((p) => p.origin === "India").length}`);
console.log(`image files present: ${present}/${P.length}${missing ? " (generate the rest; see PROMPTS.md)" : ""}`);
console.log(`example storage path: ${storagePath(P[0])}`);
if (errors.length) { console.error("\nERRORS:\n- " + errors.join("\n- ")); process.exit(1); }
