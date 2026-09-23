CREATE POLICY "Anyone can read product images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
CREATE POLICY "Sellers upload to own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Sellers update own files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Sellers delete own files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));