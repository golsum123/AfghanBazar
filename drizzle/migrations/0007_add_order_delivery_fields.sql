ALTER TABLE public.orders
  ADD COLUMN delivery_method text,
  ADD COLUMN delivery_address text,
  ADD COLUMN tracking_number text,
  ADD COLUMN estimated_delivery_date date;