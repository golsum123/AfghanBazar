// Generates the seed SQL and the image manifest from catalog.json.
// Usage: node scripts/seed-catalog/build.mjs   (writes files)   |   --check  (fails if files are stale)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
export const catalog = JSON.parse(readFileSync(join(here, "catalog.json"), "utf8"));

export const productId = (p) => `${catalog.idPrefix}${String(p.n).padStart(4, "0")}`;
export const imageFile = (p) => `${String(p.n).padStart(2, "0")}-${p.slug}.jpg`;
export const storagePath = (p) => `${catalog.demoSellerId}/${productId(p)}/${imageFile(p)}`;
export const imagePrompt = (p) => `${p.subject}. ${catalog.stylePrompt}`;

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const num = (n, d) => Number(n).toFixed(d);

export function wantedValues() {
  return catalog.products
    .map(
      (p) =>
        `   (${q(productId(p))}, ${q(p.category)}, ${q(p.name)},\n    ${q(p.description)},\n    ${num(p.price, 2)}, ${q(p.currency)}, ${q(p.origin)}, ${p.stock}, ${num(p.weight, 3)})`,
    )
    .join(",\n");
}

export function buildSeedSql(current) {
  const start = current.indexOf("  INSERT INTO wanted VALUES\n");
  const end = current.indexOf(";\n\n  SELECT string_agg(DISTINCT w.category_slug");
  if (start < 0 || end < 0) throw new Error("Seed template markers not found in 0011 seed file");
  let out =
    current.slice(0, start) + "  INSERT INTO wanted VALUES\n" + wantedValues() + current.slice(end);
  out = out.replace(/-- 0011 \(seed\): .*\n/, "-- 0011 (seed): 30 sample Afghan and Indian products so the marketplace is not empty.\n");
  out = out.replace(
    /-- Category slugs must exist[\s\S]*?\n\nBEGIN;/,
    "-- Category slugs must exist in public.categories: carpets-rugs, dried-fruits-nuts,\n-- home-decoration, jewelry-handicrafts, other, saffron-spices, traditional-clothing.\n\nBEGIN;",
  );
  return out;
}

export function buildLinkSql() {
  const rows = catalog.products.map((p) => `  (${q(productId(p))}::uuid, ${q(storagePath(p))})`).join(",\n");
  return `-- 0012 (seed): link uploaded sample product images to their products.
-- Run AFTER 0011 and AFTER the 30 image files are uploaded to the private
-- 'product-images' bucket at exactly the paths below (see seed-assets/product-images/README.md).
-- Additive and idempotent: it only inserts product_images rows, only for files that
-- really exist in storage.objects, and skips rows that are already linked.
-- It stores the storage PATH (like the app does), never a signed URL.

BEGIN;

INSERT INTO public.product_images (product_id, storage_path, url, position)
SELECT m.product_id, m.path, m.path, 0
FROM (VALUES
${rows}
) AS m(product_id, path)
JOIN public.products p ON p.id = m.product_id
JOIN storage.objects o ON o.bucket_id = 'product-images' AND o.name = m.path
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_images pi
  WHERE pi.product_id = m.product_id AND pi.storage_path = m.path
);

-- Report: products from this seed that still have no image row.
SELECT p.id, p.name
FROM public.products p
WHERE p.id::text LIKE '${catalog.idPrefix}%'
  AND NOT EXISTS (SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id);

COMMIT;
`;
}

export function buildManifest() {
  const items = catalog.products.map((p) => ({
    productId: productId(p),
    name: p.name,
    category: p.category,
    file: imageFile(p),
    storagePath: storagePath(p),
    prompt: imagePrompt(p),
  }));
  const md =
    `# Sample product image manifest\n\n` +
    `Generate one image per row with an image-generation tool you have access to, save each as the exact\n` +
    `file name shown (square JPEG, at least 1024 px; 1280 px is what the generator produces) in this folder, then follow README.md.\n\n` +
    `Negative prompt (if your tool supports one): ${catalog.negativePrompt}\n\n` +
    items.map((i, k) => `## ${k + 1}. ${i.name}\n- File: \`${i.file}\`\n- Product ID: \`${i.productId}\`\n- Prompt: ${i.prompt}\n`).join("\n");
  return { json: JSON.stringify({ negativePrompt: catalog.negativePrompt, items }, null, 2) + "\n", md };
}

const targets = () => {
  const seedPath = join(root, "drizzle/seeds/0011_seed_sample_products.sql");
  const m = buildManifest();
  return [
    [seedPath, buildSeedSql(readFileSync(seedPath, "utf8"))],
    [join(root, "drizzle/seeds/0012_link_sample_product_images.sql"), buildLinkSql()],
    [join(root, "seed-assets/product-images/manifest.json"), m.json],
    [join(root, "seed-assets/product-images/PROMPTS.md"), m.md],
  ];
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  let stale = 0;
  for (const [path, content] of targets()) {
    const same = existsSync(path) && readFileSync(path, "utf8") === content;
    if (check) {
      if (!same) { console.error(`STALE: ${path}`); stale++; }
    } else if (!same) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
      console.log(`wrote ${path}`);
    }
  }
  if (check) process.exit(stale ? 1 : 0);
}
