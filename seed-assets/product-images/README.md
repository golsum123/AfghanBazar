# Sample product images (30)

No images are committed here yet: they must be generated with a real image-generation tool.

0. Automatic route: a GitHub Actions workflow (`.github/workflows/generate-product-images.yml`) generates the images from the prompts and commits them to the feature branch. Which products it makes is set in `scripts/seed-catalog/generate.config.json`.
1. Open `PROMPTS.md` (generated from `scripts/seed-catalog/catalog.json`). Each product has its own prompt.
2. Generate one **square JPEG (at least 1024 px; the generator produces 1280 px)** per product and save it in this folder with the **exact file name** listed.
   Keep the product centered with margin: product cards crop to 4:3 and the detail page shows a square.
3. Check them offline: `node scripts/seed-catalog/validate.mjs --require-images`
   (checks all 30 exist, valid JPEG, square, >= 1024 px, < 5 MB, and no two files are identical).
   Look at every image yourself: reject any with garbled text, extra objects or distorted shapes, and regenerate.
4. Seed the products first (`drizzle/seeds/0011_seed_sample_products.sql`), then EITHER:
   - **Script (recommended):** from your own computer, with your keys only in the shell environment:
     `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-catalog/upload-images.mjs` (dry run),
     then add `--apply`. It uploads to the private `product-images` bucket and links `product_images`.
   - **Dashboard + SQL:** upload each file in the Supabase dashboard (Storage > product-images) at the path
     `00000000-0000-4000-8000-0000000d3e01/<product-id>/<file name>` (paths are in `manifest.json`),
     then run `drizzle/seeds/0012_link_sample_product_images.sql`.

The bucket stays private; the app creates short-lived signed links at view time. Never commit keys.
