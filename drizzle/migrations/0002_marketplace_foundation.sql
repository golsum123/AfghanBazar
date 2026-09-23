CREATE TYPE public.product_status AS ENUM ('active','inactive','out_of_stock');
CREATE TYPE public.currency_code AS ENUM ('AFN','INR');
CREATE TYPE public.origin_country AS ENUM ('Afghanistan','India');
CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected');

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER categories_touch BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.seller_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  description text,
  country public.origin_country,
  city text,
  phone text,
  logo_url text,
  approval_status public.approval_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_profiles TO authenticated;
GRANT ALL ON public.seller_profiles TO service_role;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view approved sellers" ON public.seller_profiles FOR SELECT TO anon, authenticated USING (approval_status = 'approved');
CREATE POLICY "Sellers view own profile" ON public.seller_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Sellers create own profile" ON public.seller_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND approval_status = 'pending' AND public.has_role(auth.uid(),'seller'));
CREATE POLICY "Sellers update own profile" ON public.seller_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage seller profiles" ON public.seller_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.guard_seller_approval() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.approval_status := OLD.approval_status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_seller_approval() FROM anon, authenticated, public;
CREATE TRIGGER seller_profiles_guard BEFORE UPDATE ON public.seller_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_seller_approval();

CREATE OR REPLACE FUNCTION public.is_approved_seller(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.seller_profiles WHERE user_id = _user_id AND approval_status = 'approved')
$$;
GRANT EXECUTE ON FUNCTION public.is_approved_seller(uuid) TO anon, authenticated;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  currency public.currency_code NOT NULL DEFAULT 'AFN',
  country_of_origin public.origin_country NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  weight numeric(10,3),
  status public.product_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_seller_idx ON public.products(seller_id);
CREATE INDEX products_category_idx ON public.products(category_id);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view listed products" ON public.products FOR SELECT TO anon, authenticated
  USING (status IN ('active','out_of_stock') AND public.is_approved_seller(seller_id));
CREATE POLICY "Sellers view own products" ON public.products FOR SELECT TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Sellers create own products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id AND public.has_role(auth.uid(),'seller'));
CREATE POLICY "Sellers update own products" ON public.products FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers delete own products" ON public.products FOR DELETE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_idx ON public.product_images(product_id);
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View images of visible products" ON public.product_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id));
CREATE POLICY "Sellers manage own product images" ON public.product_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid()));
CREATE POLICY "Admins manage product images" ON public.product_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));