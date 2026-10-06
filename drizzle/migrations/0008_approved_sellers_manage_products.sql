DROP POLICY IF EXISTS "Sellers create own products" ON public.products;
CREATE POLICY "Sellers create own products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller') AND public.is_approved_seller(auth.uid()));
DROP POLICY IF EXISTS "Sellers update own products" ON public.products;
CREATE POLICY "Sellers update own products" ON public.products FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id AND public.is_approved_seller(auth.uid()))
  WITH CHECK (auth.uid() = seller_id AND public.is_approved_seller(auth.uid()));