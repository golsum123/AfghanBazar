-- 0011 (seed): 6 sample products so the marketplace is not empty.
-- Additive only: inserts rows, never updates or deletes anything. Safe to re-run
-- (fixed UUIDs + ON CONFLICT DO NOTHING), so it cannot create duplicates.
--
-- Category slugs match the real public.categories table: carpets-rugs, dried-fruits-nuts,
-- home-decoration, jewelry-handicrafts, other, saffron-spices, traditional-clothing.
-- If any slug is missing the script stops with a clear error and inserts nothing.

BEGIN;

-- 0. Preflight: stop early, with a readable message, if the live database differs
--    from the repo migrations. Read-only; changes nothing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'seller') THEN
    RAISE EXCEPTION 'app_role has no value "seller" in this database';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint
             WHERE conrelid = 'public.profiles'::regclass AND contype = 'f'
               AND confrelid = 'auth.users'::regclass) THEN
    RAISE EXCEPTION 'public.profiles.id references auth.users here, so a login-less demo seller cannot be inserted. Do not run this seed; ask for a revised version.';
  END IF;
END $$;

-- 1. Demo seller. profiles.id is a plain uuid with no login attached, so this
--    seller cannot sign in; it only owns the sample listings.
INSERT INTO public.profiles (id, full_name, email, country, city, role)
VALUES ('00000000-0000-4000-8000-0000000d3e01', 'AfghanBazar Demo Seller', NULL, 'Afghanistan', 'Kabul', 'seller')
ON CONFLICT (id) DO NOTHING;

-- Approved, so public RLS (is_approved_seller) lets everyone see the products.
INSERT INTO public.seller_profiles (user_id, store_name, description, country, city, approval_status)
VALUES ('00000000-0000-4000-8000-0000000d3e01', 'AfghanBazar Demo Store',
        'Sample store used to showcase Afghan and Indian products.', 'Afghanistan', 'Kabul', 'approved')
ON CONFLICT (user_id) DO NOTHING;

-- 2. Products. Resolves category ids from existing categories by slug.
DO $$
DECLARE missing text;
BEGIN
  CREATE TEMP TABLE wanted (
    id uuid, category_slug text, name text, description text, price numeric(12,2),
    currency public.currency_code, country public.origin_country, stock integer, weight numeric(10,3)
  ) ON COMMIT DROP;

  INSERT INTO wanted VALUES
   ('00000000-0000-4000-8000-0000000a0001'::uuid, 'saffron-spices', 'Herat Saffron Threads (5 g)',
    'Deep-red whole saffron threads from Herat, hand-picked and sun-dried. Sealed in an airtight tin to keep aroma and colour.',
    650.00, 'AFN', 'Afghanistan', 120, 0.005),
   ('00000000-0000-4000-8000-0000000a0002'::uuid, 'carpets-rugs', 'Hand-Knotted Afghan Wool Rug (90 x 60 cm)',
    'Small hand-knotted wool rug in a traditional red and navy geometric pattern. Suitable for entrances or as a wall hanging.',
    18500.00, 'AFN', 'Afghanistan', 8, 3.200),
   ('00000000-0000-4000-8000-0000000a0003'::uuid, 'jewelry-handicrafts', 'Lapis Lazuli Pendant with Silver Setting',
    'Polished Badakhshan lapis lazuli stone set in a hand-finished silver-tone frame, on an adjustable chain.',
    2400.00, 'AFN', 'Afghanistan', 25, 0.020),
   ('00000000-0000-4000-8000-0000000a0004'::uuid, 'other', 'Darjeeling First Flush Black Tea (250 g)',
    'Light, floral loose-leaf black tea from the Darjeeling hills. Packed in a resealable pouch.',
    749.00, 'INR', 'India', 80, 0.250),
   ('00000000-0000-4000-8000-0000000a0005'::uuid, 'traditional-clothing', 'Kashmiri Embroidered Wool-Blend Shawl',
    'Soft wool-blend shawl with traditional Kashmiri needle embroidery along the border. Size about 200 x 70 cm.',
    2499.00, 'INR', 'India', 30, 0.450),
   ('00000000-0000-4000-8000-0000000a0006'::uuid, 'home-decoration', 'Jaipur Block-Print Cotton Bedsheet Set',
    'Double bedsheet with two pillow covers, hand block-printed in Jaipur on breathable cotton. Machine washable.',
    1299.00, 'INR', 'India', 40, 0.900);

  SELECT string_agg(DISTINCT w.category_slug, ', ') INTO missing
  FROM wanted w LEFT JOIN public.categories c ON c.slug = w.category_slug
  WHERE c.id IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Category slug(s) not found: %. Edit the slugs in this file to match your categories table.', missing;
  END IF;

  INSERT INTO public.products
    (id, seller_id, category_id, name, description, price, currency, country_of_origin, stock_quantity, weight, status)
  SELECT w.id, '00000000-0000-4000-8000-0000000d3e01', c.id, w.name, w.description, w.price, w.currency,
         w.country, w.stock, w.weight, 'active'
  FROM wanted w JOIN public.categories c ON c.slug = w.category_slug
  ON CONFLICT (id) DO NOTHING;
END $$;

COMMIT;
