// Uploads the generated sample images to the private 'product-images' bucket and links them in
// product_images. Run it yourself, locally, AFTER seeding 0011. Dry run unless --apply is passed.
//
//   SUPABASE_URL=https://<project>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> \
//     node scripts/seed-catalog/upload-images.mjs [--apply]
//
// The service-role key is read from the environment only. It is never printed or stored.
// Only paths are saved in the database (never signed URLs); the bucket stays private.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { catalog, productId, imageFile, storagePath } from "./build.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imgDir = join(root, "seed-assets/product-images");
const apply = process.argv.includes("--apply");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "product-images";

const missing = catalog.products.filter((p) => !existsSync(join(imgDir, imageFile(p))));
if (missing.length) {
  console.error(`Missing ${missing.length} image file(s) in seed-assets/product-images:`);
  for (const p of missing) console.error(`  ${imageFile(p)}`);
  process.exit(1);
}
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell environment (do not commit them).");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

// The bucket must already exist. It should be PRIVATE; this script never changes bucket settings.
const { data: bucket, error: be } = await sb.storage.getBucket(BUCKET);
if (be || !bucket) {
  console.error(`Storage bucket "${BUCKET}" was not found. Create it as a PRIVATE bucket in Supabase first.`);
  process.exit(1);
}
if (bucket.public) console.warn(`WARNING: bucket "${BUCKET}" is PUBLIC. The app expects a private bucket; consider making it private.`);

let uploaded = 0, linked = 0, skipped = 0;
for (const p of catalog.products) {
  const id = productId(p), path = storagePath(p);
  const { data: prod, error: pe } = await sb.from("products").select("id").eq("id", id).maybeSingle();
  if (pe) throw new Error(`products lookup failed: ${pe.message}`);
  if (!prod) { console.error(`SKIP ${p.name}: product row not found (run the 0011 seed first)`); skipped++; continue; }

  const { data: existing, error: le } = await sb.from("product_images").select("id").eq("product_id", id).eq("storage_path", path).maybeSingle();
  if (le) throw new Error(`product_images lookup failed: ${le.message}`);
  if (existing) { console.log(`ok   ${p.name}: already linked`); skipped++; continue; }

  if (!apply) { console.log(`DRY  ${p.name}: would upload ${imageFile(p)} -> ${path} and link it`); continue; }

  const body = readFileSync(join(imgDir, imageFile(p)));
  const { error: ue } = await sb.storage.from(BUCKET).upload(path, body, { contentType: "image/jpeg", upsert: false });
  if (ue && !/already exists|Duplicate/i.test(ue.message)) throw new Error(`upload failed for ${path}: ${ue.message}`);
  if (!ue) uploaded++;
  const { error: ie } = await sb.from("product_images").insert({ product_id: id, storage_path: path, url: path, position: 0 });
  if (ie) throw new Error(`link failed for ${path}: ${ie.message}`);
  linked++;
  console.log(`done ${p.name}`);
}
console.log(`\n${apply ? "Applied" : "Dry run"}: uploaded=${uploaded} linked=${linked} skipped=${skipped}`);
