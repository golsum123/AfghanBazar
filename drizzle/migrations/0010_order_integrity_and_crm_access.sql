-- 0010: order integrity, checkout hardening and read-only CRM access.
-- Additive / backward compatible: no tables, columns or data are dropped or rewritten.

-- 1. Cart: only items from approved sellers may be added (place_order already enforced this).
CREATE OR REPLACE FUNCTION public.validate_cart_quantity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s integer; st public.product_status; sid uuid;
BEGIN
  SELECT stock_quantity, status, seller_id INTO s, st, sid FROM public.products WHERE id = NEW.product_id;
  IF s IS NULL OR st <> 'active' OR NOT public.is_approved_seller(sid) THEN RAISE EXCEPTION 'This product is not available'; END IF;
  IF NEW.quantity > s THEN RAISE EXCEPTION 'Only % in stock', s; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

-- 2. place_order: input validation, no buying your own products, and a per-user
--    advisory lock so a double submit cannot create two orders from the same cart.
CREATE OR REPLACE FUNCTION public.place_order(_full_name text, _phone text, _country text, _city text, _address text, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); oid uuid; r record; n int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF coalesce(trim(_full_name),'')='' OR coalesce(trim(_phone),'')='' OR coalesce(trim(_country),'')='' OR coalesce(trim(_city),'')='' OR coalesce(trim(_address),'')='' THEN
    RAISE EXCEPTION 'Please fill in all required fields'; END IF;
  IF char_length(trim(_full_name)) > 120 OR char_length(trim(_country)) > 80 OR char_length(trim(_city)) > 80
     OR char_length(trim(_address)) > 300 OR char_length(coalesce(_notes,'')) > 500 THEN
    RAISE EXCEPTION 'One of the fields is too long'; END IF;
  IF trim(_phone) !~ '^\+?[0-9][0-9 ()\-]{5,19}$' THEN
    RAISE EXCEPTION 'Please enter a valid phone number'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  INSERT INTO orders(user_id, full_name, phone, country, city, address, notes)
  VALUES (uid, trim(_full_name), trim(_phone), trim(_country), trim(_city), trim(_address), nullif(trim(coalesce(_notes,'')),''))
  RETURNING id INTO oid;
  FOR r IN SELECT c.quantity, p.* FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = uid FOR UPDATE OF p LOOP
    IF r.seller_id = uid THEN RAISE EXCEPTION 'You cannot order your own product (%)', r.name; END IF;
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

-- 3. Orders: validated status changes, immutable ownership/totals, restock on cancel.
CREATE OR REPLACE FUNCTION public.order_status_rank(s public.order_status) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE s WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'processing' THEN 2
                WHEN 'shipped' THEN 3 WHEN 'delivered' THEN 4 ELSE -1 END
$$;

CREATE OR REPLACE FUNCTION public.guard_order_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Totals are written once by place_order while the order is still 'pending'.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (OLD.status <> 'pending' AND (NEW.total_afn IS DISTINCT FROM OLD.total_afn OR NEW.total_inr IS DISTINCT FROM OLD.total_inr)) THEN
    RAISE EXCEPTION 'Order owner, totals and creation date cannot be changed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status IN ('delivered','cancelled') THEN
      RAISE EXCEPTION 'A % order can no longer change status', OLD.status;
    ELSIF NEW.status = 'cancelled' THEN
      -- Return the reserved stock to the products that still exist.
      UPDATE public.products p
      SET stock_quantity = p.stock_quantity + oi.quantity,
          status = CASE WHEN p.status = 'out_of_stock' THEN 'active'::public.product_status ELSE p.status END
      FROM public.order_items oi
      WHERE oi.order_id = OLD.id AND oi.product_id = p.id;
    ELSIF public.order_status_rank(NEW.status) <= public.order_status_rank(OLD.status) THEN
      RAISE EXCEPTION 'Cannot move an order from % back to %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_order_update() FROM anon, authenticated, public;
CREATE TRIGGER orders_guard_update BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_order_update();

-- Length limits; NOT VALID so existing rows are left untouched.
ALTER TABLE public.orders
  ADD CONSTRAINT orders_text_lengths CHECK (
    char_length(full_name) <= 120 AND char_length(phone) <= 30 AND char_length(address) <= 300
    AND char_length(coalesce(tracking_number,'')) <= 100 AND char_length(coalesce(delivery_method,'')) <= 100
  ) NOT VALID;

-- 4. Read-only CRM staff access (no write policies: CRM cannot approve sellers or change orders).
CREATE POLICY "CRM staff view profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'crm_staff'));
CREATE POLICY "CRM staff view orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'crm_staff'));
CREATE POLICY "CRM staff view order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'crm_staff'));
CREATE POLICY "CRM staff view seller profiles" ON public.seller_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'crm_staff'));
CREATE POLICY "CRM staff view products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'crm_staff'));
