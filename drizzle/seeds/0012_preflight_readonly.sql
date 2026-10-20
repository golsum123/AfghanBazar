-- 0012 preflight (READ-ONLY): run this BEFORE 0012_link_sample_product_images.sql.
-- Changes nothing. Run each statement separately in the SQL editor (it shows one result at a time).

-- 1. Is the bucket private? Expect public = false (the app uses signed URLs).
SELECT id, name, public FROM storage.buckets WHERE id = 'product-images';

-- 2. Existing product_images rows (the old rug.jpg row stays untouched).
SELECT id, product_id, storage_path, position FROM public.product_images ORDER BY created_at;

-- 3. Every file currently in the bucket, with its real path.
SELECT name AS storage_path, created_at FROM storage.objects WHERE bucket_id = 'product-images' ORDER BY name;

-- 4. Status of each of the 30 expected files (product exists? file uploaded, and at which path? already linked?).
WITH expected(product_id, file_name, expected_path) AS (VALUES
  ('00000000-0000-4000-8000-0000000a0001'::uuid, '01-herat-saffron-5g.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0001/01-herat-saffron-5g.jpg'),
  ('00000000-0000-4000-8000-0000000a0002'::uuid, '02-afghan-wool-rug-90x60.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0002/02-afghan-wool-rug-90x60.jpg'),
  ('00000000-0000-4000-8000-0000000a0003'::uuid, '03-lapis-lazuli-pendant.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0003/03-lapis-lazuli-pendant.jpg'),
  ('00000000-0000-4000-8000-0000000a0004'::uuid, '04-darjeeling-first-flush-tea.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0004/04-darjeeling-first-flush-tea.jpg'),
  ('00000000-0000-4000-8000-0000000a0005'::uuid, '05-kashmiri-embroidered-shawl.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0005/05-kashmiri-embroidered-shawl.jpg'),
  ('00000000-0000-4000-8000-0000000a0006'::uuid, '06-jaipur-block-print-bedsheet.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0006/06-jaipur-block-print-bedsheet.jpg'),
  ('00000000-0000-4000-8000-0000000a0007'::uuid, '07-afghan-baluchi-prayer-rug.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0007/07-afghan-baluchi-prayer-rug.jpg'),
  ('00000000-0000-4000-8000-0000000a0008'::uuid, '08-afghan-kilim-flatweave-rug.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0008/08-afghan-kilim-flatweave-rug.jpg'),
  ('00000000-0000-4000-8000-0000000a0009'::uuid, '09-kashmiri-silk-blend-rug.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0009/09-kashmiri-silk-blend-rug.jpg'),
  ('00000000-0000-4000-8000-0000000a0010'::uuid, '10-jaipur-cotton-dhurrie.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0010/10-jaipur-cotton-dhurrie.jpg'),
  ('00000000-0000-4000-8000-0000000a0011'::uuid, '11-afghan-green-raisins-500g.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0011/11-afghan-green-raisins-500g.jpg'),
  ('00000000-0000-4000-8000-0000000a0012'::uuid, '12-afghan-pistachios-500g.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0012/12-afghan-pistachios-500g.jpg'),
  ('00000000-0000-4000-8000-0000000a0013'::uuid, '13-indian-whole-cashews-500g.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0013/13-indian-whole-cashews-500g.jpg'),
  ('00000000-0000-4000-8000-0000000a0014'::uuid, '14-kashmiri-mamra-almonds-250g.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0014/14-kashmiri-mamra-almonds-250g.jpg'),
  ('00000000-0000-4000-8000-0000000a0015'::uuid, '15-afghan-black-cumin-100g.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0015/15-afghan-black-cumin-100g.jpg'),
  ('00000000-0000-4000-8000-0000000a0016'::uuid, '16-kashmiri-mongra-saffron-1g.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0016/16-kashmiri-mongra-saffron-1g.jpg'),
  ('00000000-0000-4000-8000-0000000a0017'::uuid, '17-kerala-green-cardamom-100g.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0017/17-kerala-green-cardamom-100g.jpg'),
  ('00000000-0000-4000-8000-0000000a0018'::uuid, '18-kuchi-tribal-necklace.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0018/18-kuchi-tribal-necklace.jpg'),
  ('00000000-0000-4000-8000-0000000a0019'::uuid, '19-lapis-lazuli-bead-bracelet.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0019/19-lapis-lazuli-bead-bracelet.jpg'),
  ('00000000-0000-4000-8000-0000000a0020'::uuid, '20-meenakari-jhumka-earrings.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0020/20-meenakari-jhumka-earrings.jpg'),
  ('00000000-0000-4000-8000-0000000a0021'::uuid, '21-channapatna-wooden-toy-set.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0021/21-channapatna-wooden-toy-set.jpg'),
  ('00000000-0000-4000-8000-0000000a0022'::uuid, '22-afghan-embroidered-dress.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0022/22-afghan-embroidered-dress.jpg'),
  ('00000000-0000-4000-8000-0000000a0023'::uuid, '23-afghan-pakol-wool-cap.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0023/23-afghan-pakol-wool-cap.jpg'),
  ('00000000-0000-4000-8000-0000000a0024'::uuid, '24-banarasi-silk-blend-dupatta.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0024/24-banarasi-silk-blend-dupatta.jpg'),
  ('00000000-0000-4000-8000-0000000a0025'::uuid, '25-istalif-turquoise-ceramic-plate.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0025/25-istalif-turquoise-ceramic-plate.jpg'),
  ('00000000-0000-4000-8000-0000000a0026'::uuid, '26-afghan-felt-cushion-cover.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0026/26-afghan-felt-cushion-cover.jpg'),
  ('00000000-0000-4000-8000-0000000a0027'::uuid, '27-jaipur-blue-pottery-vase.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0027/27-jaipur-blue-pottery-vase.jpg'),
  ('00000000-0000-4000-8000-0000000a0028'::uuid, '28-afghan-mountain-honey-500g.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0028/28-afghan-mountain-honey-500g.jpg'),
  ('00000000-0000-4000-8000-0000000a0029'::uuid, '29-afghan-nabat-rock-sugar-250g.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0029/29-afghan-nabat-rock-sugar-250g.jpg'),
  ('00000000-0000-4000-8000-0000000a0030'::uuid, '30-kashmiri-kahwa-tea-100g.jpg', '00000000-0000-4000-8000-0000000d3e01/00000000-0000-4000-8000-0000000a0030/30-kashmiri-kahwa-tea-100g.jpg')
),
resolved AS (
  -- Find the uploaded file for each product: prefer the exact expected path, otherwise any object in the
  -- bucket whose file name matches (so files uploaded at the bucket root or in another folder still link).
  SELECT e.product_id, e.file_name, e.expected_path, o.name AS actual_path,
    (SELECT count(*) FROM storage.objects x
      WHERE x.bucket_id = 'product-images' AND (x.name = e.file_name OR x.name LIKE '%/' || e.file_name)) AS n_matches
  FROM expected e
  LEFT JOIN LATERAL (
    SELECT x.name FROM storage.objects x
    WHERE x.bucket_id = 'product-images' AND (x.name = e.file_name OR x.name LIKE '%/' || e.file_name)
    ORDER BY (x.name = e.expected_path) DESC, x.name
    LIMIT 1
  ) o ON true
)
SELECT r.file_name, r.actual_path AS storage_path,
  CASE
    WHEN p.id IS NULL THEN 'MISSING: product row not found in public.products'
    WHEN r.actual_path IS NULL THEN 'MISSING: file not found in storage.objects (bucket product-images)'
    WHEN pi.id IS NULL THEN 'NOT LINKED'
    ELSE 'linked'
  END AS status,
  CASE WHEN r.actual_path IS NULL THEN NULL WHEN r.actual_path = r.expected_path THEN 'expected path' ELSE 'different path' END AS path_check,
  CASE WHEN r.n_matches > 1 THEN r.n_matches || ' files share this name; the first was used' END AS note
FROM resolved r
LEFT JOIN public.products p ON p.id = r.product_id
LEFT JOIN public.product_images pi ON pi.product_id = r.product_id AND pi.storage_path = r.actual_path
ORDER BY r.file_name;
