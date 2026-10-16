-- 0011: fix infinite RLS recursion between public.orders and public.order_items.
--
-- Cause (0009): the orders policy "Sellers view orders containing their items" reads order_items,
-- while the order_items policy "Customers view own order items" (0005) reads orders. Evaluating
-- either table's policies therefore loops, and PostgreSQL raises
-- "infinite recursion detected in policy" for every signed-in user.
--
-- Fix: move the seller check into a narrow SECURITY DEFINER function so the orders policy no
-- longer triggers order_items RLS. The function only ever answers for the CALLER (auth.uid()),
-- so it reveals nothing a seller could not already see. No access is added or widened.
-- Additive/replace-only: no tables, columns or data are touched. Safe to run more than once.

CREATE OR REPLACE FUNCTION public.seller_has_items_in_order(_order_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = _order_id AND oi.seller_id = auth.uid()
  )
$$;
REVOKE EXECUTE ON FUNCTION public.seller_has_items_in_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_has_items_in_order(uuid) TO authenticated;

DROP POLICY IF EXISTS "Sellers view orders containing their items" ON public.orders;
CREATE POLICY "Sellers view orders containing their items"
ON public.orders FOR SELECT TO authenticated
USING (public.seller_has_items_in_order(id));
