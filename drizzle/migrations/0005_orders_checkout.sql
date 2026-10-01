CREATE TYPE public.order_status AS ENUM ('pending','confirmed','processing','shipped','delivered','cancelled');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.order_status NOT NULL DEFAULT 'pending',
  full_name text NOT NULL,
  phone text NOT NULL,
  country text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  notes text,
  total_afn numeric NOT NULL DEFAULT 0,
  total_inr numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  seller_id uuid,
  product_name text NOT NULL,
  unit_price numeric NOT NULL,
  currency public.currency_code NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view own order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins view all order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.place_order(_full_name text, _phone text, _country text, _city text, _address text, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); oid uuid; r record; n int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF coalesce(trim(_full_name),'')='' OR coalesce(trim(_phone),'')='' OR coalesce(trim(_country),'')='' OR coalesce(trim(_city),'')='' OR coalesce(trim(_address),'')='' THEN
    RAISE EXCEPTION 'Please fill in all required fields'; END IF;
  INSERT INTO orders(user_id, full_name, phone, country, city, address, notes)
  VALUES (uid, trim(_full_name), trim(_phone), trim(_country), trim(_city), trim(_address), nullif(trim(coalesce(_notes,'')),''))
  RETURNING id INTO oid;
  FOR r IN SELECT c.quantity, p.* FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = uid FOR UPDATE OF p LOOP
    IF r.status <> 'active' OR NOT is_approved_seller(r.seller_id) THEN RAISE EXCEPTION '% is no longer available', r.name; END IF;
    IF r.quantity > r.stock_quantity THEN RAISE EXCEPTION 'Only % of % left in stock', r.stock_quantity, r.name; END IF;
    INSERT INTO order_items(order_id, product_id, seller_id, product_name, unit_price, currency, quantity)
    VALUES (oid, r.id, r.seller_id, r.name, r.price, r.currency, r.quantity);
    UPDATE products SET stock_quantity = stock_quantity - r.quantity,
      status = CASE WHEN stock_quantity - r.quantity = 0 THEN 'out_of_stock'::product_status ELSE status END
    WHERE id = r.id;
    n := n + 1;
  END LOOP;
  IF n = 0 THEN RAISE EXCEPTION 'Your cart is empty'; END IF;
  UPDATE orders SET
    total_afn = coalesce((SELECT sum(unit_price*quantity) FROM order_items WHERE order_id=oid AND currency='AFN'),0),
    total_inr = coalesce((SELECT sum(unit_price*quantity) FROM order_items WHERE order_id=oid AND currency='INR'),0),
    status = 'confirmed'
  WHERE id = oid;
  DELETE FROM cart_items WHERE user_id = uid;
  RETURN oid;
END; $$;
REVOKE EXECUTE ON FUNCTION public.place_order(text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(text,text,text,text,text,text) TO authenticated;