CREATE POLICY "Sellers view orders containing their items"
ON public.orders FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.order_items oi
  WHERE oi.order_id = orders.id AND oi.seller_id = auth.uid()
));

CREATE POLICY "Sellers view own order items"
ON public.order_items FOR SELECT TO authenticated
USING (seller_id = auth.uid());