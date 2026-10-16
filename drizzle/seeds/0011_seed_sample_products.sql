-- 0011 (seed): 30 sample Afghan and Indian products so the marketplace is not empty.
-- Additive only: this script only INSERTs. It never updates or deletes anything.
-- Re-running is safe: rows that already exist with the same content are skipped;
-- rows that exist with DIFFERENT content make the script stop with an error.
-- Everything runs in one transaction, so any error leaves the database unchanged.
--
-- Category slugs must exist in public.categories: carpets-rugs, dried-fruits-nuts,
-- home-decoration, jewelry-handicrafts, other, saffron-spices, traditional-clothing.

BEGIN;

DO $$
DECLARE
  demo constant uuid := '00000000-0000-4000-8000-0000000d3e01';
  t record;
  bad text;
BEGIN
  ---------------------------------------------------------------------------
  -- A. Preflight: verify the live schema before inserting anything.
  ---------------------------------------------------------------------------
  FOR t IN SELECT * FROM (VALUES ('profiles'),('seller_profiles'),('products'),('categories')) v(tbl) LOOP
    IF to_regclass('public.' || t.tbl) IS NULL THEN
      RAISE EXCEPTION 'Table public.% does not exist', t.tbl;
    END IF;
  END LOOP;

  -- Enum values used by this seed.
  FOR t IN SELECT * FROM (VALUES
      ('app_role','seller'), ('product_status','active'),
      ('currency_code','AFN'), ('currency_code','INR'),
      ('origin_country','Afghanistan'), ('origin_country','India'),
      ('approval_status','approved')) v(typ, lbl) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type ty ON ty.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = ty.typnamespace
      WHERE n.nspname = 'public' AND ty.typname = t.typ AND e.enumlabel = t.lbl) THEN
      RAISE EXCEPTION 'Enum public.% has no value "%"', t.typ, t.lbl;
    END IF;
  END LOOP;

  -- Every column this seed writes must exist, and no other column may be
  -- NOT NULL without a default (it would make the insert fail or need a value).
  FOR t IN SELECT * FROM (VALUES
      ('profiles',        ARRAY['id','full_name','email','country','city','role']),
      ('seller_profiles', ARRAY['user_id','store_name','description','country','city','approval_status']),
      ('products',        ARRAY['id','seller_id','category_id','name','description','price','currency',
                                'country_of_origin','stock_quantity','weight','status'])
    ) v(tbl, cols) LOOP
    SELECT string_agg(c, ', ') INTO bad
    FROM unnest(t.cols) c
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = t.tbl AND column_name = c);
    IF bad IS NOT NULL THEN
      RAISE EXCEPTION 'public.% is missing column(s): %', t.tbl, bad;
    END IF;

    SELECT string_agg(column_name, ', ') INTO bad
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = t.tbl
      AND is_nullable = 'NO' AND column_default IS NULL
      AND is_identity = 'NO' AND is_generated = 'NEVER'
      AND NOT (column_name = ANY (t.cols));
    IF bad IS NOT NULL THEN
      RAISE EXCEPTION 'public.% has required column(s) this seed does not set: %', t.tbl, bad;
    END IF;
  END LOOP;

  -- profiles must not be tied to a login (any foreign key would break a login-less demo seller).
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND contype = 'f') THEN
    RAISE EXCEPTION 'public.profiles has a foreign key in this database; a login-less demo seller cannot be inserted. Do not run this seed.';
  END IF;

  -- No user-defined INSERT triggers (their behaviour is unknown to this seed).
  SELECT string_agg(c.relname || '.' || tg.tgname, ', ') INTO bad
  FROM pg_trigger tg
  JOIN pg_class c ON c.oid = tg.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('profiles','seller_profiles','products')
    AND NOT tg.tgisinternal AND (tg.tgtype & 4) <> 0;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected INSERT trigger(s) found: %. Review them before running this seed.', bad;
  END IF;

  -- The demo id must not belong to a real login account.
  BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = demo) THEN
      RAISE EXCEPTION 'The demo seller id % belongs to a real auth user', demo;
    END IF;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN
    NULL; -- cannot read auth.users here; the profiles foreign-key check above still applies
  END;

  ---------------------------------------------------------------------------
  -- B. Conflict check: fixed ids that already exist must hold the same data.
  ---------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = demo
             AND (full_name, role) IS DISTINCT FROM ('AfghanBazar Demo Seller'::text, 'seller'::public.app_role)) THEN
    RAISE EXCEPTION 'profiles row % already exists with different data; refusing to continue', demo;
  END IF;

  IF EXISTS (SELECT 1 FROM public.seller_profiles WHERE user_id = demo
             AND (store_name, approval_status) IS DISTINCT FROM ('AfghanBazar Demo Store'::text, 'approved'::public.approval_status)) THEN
    RAISE EXCEPTION 'seller_profiles row for % already exists with different data (or is not approved); refusing to continue', demo;
  END IF;

  CREATE TEMP TABLE wanted (
    id uuid, category_slug text, name text, description text, price numeric(12,2),
    currency public.currency_code, country public.origin_country, stock integer, weight numeric(10,3)
  ) ON COMMIT DROP;

  INSERT INTO wanted VALUES
   ('00000000-0000-4000-8000-0000000a0001', 'saffron-spices', 'Herat Saffron Threads (5 g)',
    'Deep-red whole saffron threads from Herat, hand-picked and sun-dried. Sealed in an airtight tin to keep aroma and colour.',
    650.00, 'AFN', 'Afghanistan', 120, 0.005),
   ('00000000-0000-4000-8000-0000000a0002', 'carpets-rugs', 'Hand-Knotted Afghan Wool Rug (90 x 60 cm)',
    'Small hand-knotted wool rug in a traditional red and navy geometric pattern. Suitable for entrances or as a wall hanging.',
    18500.00, 'AFN', 'Afghanistan', 8, 3.200),
   ('00000000-0000-4000-8000-0000000a0003', 'jewelry-handicrafts', 'Lapis Lazuli Pendant with Silver Setting',
    'Polished Badakhshan lapis lazuli stone set in a hand-finished silver-tone frame, on an adjustable chain.',
    2400.00, 'AFN', 'Afghanistan', 25, 0.020),
   ('00000000-0000-4000-8000-0000000a0004', 'other', 'Darjeeling First Flush Black Tea (250 g)',
    'Light, floral loose-leaf black tea from the Darjeeling hills. Packed in a resealable pouch.',
    749.00, 'INR', 'India', 80, 0.250),
   ('00000000-0000-4000-8000-0000000a0005', 'traditional-clothing', 'Kashmiri Embroidered Wool-Blend Shawl',
    'Soft wool-blend shawl with traditional Kashmiri needle embroidery along the border. Size about 200 x 70 cm.',
    2499.00, 'INR', 'India', 30, 0.450),
   ('00000000-0000-4000-8000-0000000a0006', 'home-decoration', 'Jaipur Block-Print Cotton Bedsheet Set',
    'Double bedsheet with two pillow covers, hand block-printed in Jaipur on breathable cotton. Machine washable.',
    1299.00, 'INR', 'India', 40, 0.900),
   ('00000000-0000-4000-8000-0000000a0007', 'carpets-rugs', 'Afghan Baluchi Prayer Rug (Wool, 130 x 80 cm)',
    'Hand-woven wool prayer rug in deep burgundy, charcoal and ivory with a traditional arch design. Dense, durable pile.',
    14500.00, 'AFN', 'Afghanistan', 6, 2.900),
   ('00000000-0000-4000-8000-0000000a0008', 'carpets-rugs', 'Afghan Kilim Flat-Weave Wool Rug (120 x 80 cm)',
    'Reversible flat-weave wool kilim with bold geometric bands in rust, indigo and cream. Light and easy to move.',
    9800.00, 'AFN', 'Afghanistan', 9, 2.100),
   ('00000000-0000-4000-8000-0000000a0009', 'carpets-rugs', 'Kashmiri Hand-Knotted Silk-Blend Rug (90 x 60 cm)',
    'Fine hand-knotted silk-blend rug with a floral medallion design in rose, sage and gold tones. A decorative accent piece.',
    21999.00, 'INR', 'India', 4, 1.800),
   ('00000000-0000-4000-8000-0000000a0010', 'carpets-rugs', 'Jaipur Hand-Woven Cotton Dhurrie (150 x 90 cm)',
    'Flat-weave cotton dhurrie with mustard and indigo stripes. Washable, lightweight and reversible.',
    3299.00, 'INR', 'India', 18, 2.000),
   ('00000000-0000-4000-8000-0000000a0011', 'dried-fruits-nuts', 'Afghan Green Raisins - Kishmish (500 g)',
    'Naturally sun-dried green raisins with a soft texture and mild sweetness. Packed in a resealable bag.',
    420.00, 'AFN', 'Afghanistan', 150, 0.500),
   ('00000000-0000-4000-8000-0000000a0012', 'dried-fruits-nuts', 'Afghan Pistachios, In-Shell (500 g)',
    'Raw in-shell pistachios with a rich, buttery flavour. Packed in a resealable bag.',
    1350.00, 'AFN', 'Afghanistan', 90, 0.500),
   ('00000000-0000-4000-8000-0000000a0013', 'dried-fruits-nuts', 'Indian Whole Cashews W240 (500 g)',
    'Large, creamy whole cashew kernels, naturally unsalted. Packed in a resealable bag.',
    699.00, 'INR', 'India', 120, 0.500),
   ('00000000-0000-4000-8000-0000000a0014', 'dried-fruits-nuts', 'Kashmiri Mamra-Style Almonds (250 g)',
    'Dense, oil-rich almonds with a sweet, nutty flavour. Packed in a resealable bag.',
    849.00, 'INR', 'India', 80, 0.250),
   ('00000000-0000-4000-8000-0000000a0015', 'saffron-spices', 'Afghan Black Cumin Seeds - Zira Siyah (100 g)',
    'Aromatic dark cumin seeds for rice, stews and spice blends. Packed in an airtight jar.',
    280.00, 'AFN', 'Afghanistan', 140, 0.100),
   ('00000000-0000-4000-8000-0000000a0016', 'saffron-spices', 'Kashmiri Mongra Saffron (1 g)',
    'Vivid red saffron threads with a strong aroma, from the Kashmir valley. Sealed in a small glass vial.',
    590.00, 'INR', 'India', 70, 0.001),
   ('00000000-0000-4000-8000-0000000a0017', 'saffron-spices', 'Kerala Green Cardamom Pods (100 g)',
    'Fragrant whole green cardamom pods for tea, sweets and curries. Packed in a resealable pouch.',
    449.00, 'INR', 'India', 110, 0.100),
   ('00000000-0000-4000-8000-0000000a0018', 'jewelry-handicrafts', 'Afghan Kuchi Tribal Statement Necklace (Silver-Tone)',
    'Handcrafted silver-tone necklace in traditional Kuchi style with engraved discs and small coloured glass accents.',
    3200.00, 'AFN', 'Afghanistan', 12, 0.180),
   ('00000000-0000-4000-8000-0000000a0019', 'jewelry-handicrafts', 'Lapis Lazuli Bead Bracelet',
    'Stretch bracelet of polished lapis lazuli beads from Badakhshan. Beads are natural stone, so colour varies slightly.',
    1800.00, 'AFN', 'Afghanistan', 30, 0.040),
   ('00000000-0000-4000-8000-0000000a0020', 'jewelry-handicrafts', 'Jaipur Meenakari Enamel Jhumka Earrings',
    'Dome-shaped jhumka earrings with hand-painted meenakari enamel in green, pink and blue on a gold-tone base.',
    1199.00, 'INR', 'India', 35, 0.030),
   ('00000000-0000-4000-8000-0000000a0021', 'jewelry-handicrafts', 'Channapatna Lacquered Wooden Toy Set (5 pieces)',
    'Hand-turned wooden toys finished in smooth, bright lacquer. Child-safe finish. Set of five shapes.',
    899.00, 'INR', 'India', 40, 0.400),
   ('00000000-0000-4000-8000-0000000a0022', 'traditional-clothing', 'Afghan Hand-Embroidered Cotton Dress (Kuchi-Style)',
    'Loose cotton dress with dense hand embroidery and mirror-work on the bodice and sleeves, in rich red and black.',
    5200.00, 'AFN', 'Afghanistan', 10, 0.700),
   ('00000000-0000-4000-8000-0000000a0023', 'traditional-clothing', 'Afghan Pakol Wool Cap',
    'Traditional rolled-brim pakol cap in thick hand-woven wool. Warm, soft and available in earthy tones.',
    850.00, 'AFN', 'Afghanistan', 45, 0.150),
   ('00000000-0000-4000-8000-0000000a0024', 'traditional-clothing', 'Banarasi Silk-Blend Dupatta',
    'Lightweight dupatta with a woven gold-tone border and floral motifs in a deep maroon silk blend.',
    2799.00, 'INR', 'India', 22, 0.250),
   ('00000000-0000-4000-8000-0000000a0025', 'home-decoration', 'Istalif-Style Turquoise Glazed Ceramic Plate (28 cm)',
    'Hand-thrown ceramic plate with a glossy turquoise glaze and dark floral detail. Decorative; hand wash only.',
    1500.00, 'AFN', 'Afghanistan', 20, 0.900),
   ('00000000-0000-4000-8000-0000000a0026', 'home-decoration', 'Afghan Felted Wool Cushion Cover (45 x 45 cm)',
    'Thick felted wool cushion cover with a bold geometric pattern in cream, rust and charcoal. Zipper closure; insert not included.',
    1100.00, 'AFN', 'Afghanistan', 28, 0.300),
   ('00000000-0000-4000-8000-0000000a0027', 'home-decoration', 'Jaipur Blue Pottery Vase (25 cm)',
    'Hand-painted blue pottery vase with floral motifs in cobalt and turquoise on a white glaze. Decorative; not watertight.',
    1499.00, 'INR', 'India', 25, 1.100),
   ('00000000-0000-4000-8000-0000000a0028', 'other', 'Afghan Wild Mountain Honey (500 g)',
    'Thick, golden honey from mountain wildflowers, packed in a glass jar. Natural crystallisation may occur.',
    950.00, 'AFN', 'Afghanistan', 60, 0.750),
   ('00000000-0000-4000-8000-0000000a0029', 'other', 'Afghan Nabat Crystal Rock Sugar (250 g)',
    'Traditional crystallised sugar chunks, used to sweeten tea. Packed in a resealable bag.',
    220.00, 'AFN', 'Afghanistan', 100, 0.250),
   ('00000000-0000-4000-8000-0000000a0030', 'other', 'Kashmiri Kahwa Tea Blend (100 g)',
    'Green tea blended with cardamom, cinnamon and saffron notes, in the style of Kashmiri kahwa. Packed in a resealable pouch.',
    399.00, 'INR', 'India', 85, 0.100);

  SELECT string_agg(DISTINCT w.category_slug, ', ') INTO bad
  FROM wanted w LEFT JOIN public.categories c ON c.slug = w.category_slug
  WHERE c.id IS NULL;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Category slug(s) not found: %', bad;
  END IF;

  -- Existing products with a seed id must match the seed (stock and status may
  -- legitimately change after sales or admin edits, so they are not compared).
  SELECT string_agg(w.id::text, ', ') INTO bad
  FROM wanted w
  JOIN public.categories c ON c.slug = w.category_slug
  JOIN public.products p ON p.id = w.id
  WHERE (p.seller_id, p.category_id, p.name, p.description, p.price, p.currency, p.country_of_origin, p.weight)
        IS DISTINCT FROM (demo, c.id, w.name, w.description, w.price, w.currency, w.country, w.weight);
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Product id(s) already exist with different data: %. Refusing to continue.', bad;
  END IF;

  ---------------------------------------------------------------------------
  -- C. Inserts (only reached if every check above passed).
  ---------------------------------------------------------------------------
  INSERT INTO public.profiles (id, full_name, email, country, city, role)
  VALUES (demo, 'AfghanBazar Demo Seller', NULL, 'Afghanistan', 'Kabul', 'seller')
  ON CONFLICT (id) DO NOTHING;

  -- Approved, so public RLS (is_approved_seller) lets everyone see the products.
  INSERT INTO public.seller_profiles (user_id, store_name, description, country, city, approval_status)
  VALUES (demo, 'AfghanBazar Demo Store',
          'Sample store used to showcase Afghan and Indian products.', 'Afghanistan', 'Kabul', 'approved')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.products
    (id, seller_id, category_id, name, description, price, currency, country_of_origin, stock_quantity, weight, status)
  SELECT w.id, demo, c.id, w.name, w.description, w.price, w.currency, w.country, w.stock, w.weight, 'active'
  FROM wanted w JOIN public.categories c ON c.slug = w.category_slug
  ON CONFLICT (id) DO NOTHING;
END $$;

COMMIT;
