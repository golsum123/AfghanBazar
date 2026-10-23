-- 0011: only approved sellers may write product images to storage.
-- Product rows were already limited to approved sellers (0008); this closes the matching gap for
-- storage so a pending or rejected seller cannot upload files to the public product-images bucket.
-- Additive policy swap, no data touched. Not applied to the live database by the app.
DROP POLICY IF EXISTS "Sellers upload to own folder" ON storage.objects;
CREATE POLICY "Sellers upload to own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR ((storage.foldername(name))[1] = auth.uid()::text AND public.is_approved_seller(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Sellers update own files" ON storage.objects;
CREATE POLICY "Sellers update own files" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR ((storage.foldername(name))[1] = auth.uid()::text AND public.is_approved_seller(auth.uid()))
    )
  );
