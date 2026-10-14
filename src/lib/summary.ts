import { supabase } from "@/integrations/supabase/client";

export interface BusinessSummary {
  accounts: number;
  approvedSellers: number;
  pendingSellers: number;
  products: number;
  orders: number;
  /** Orders that are not yet delivered or cancelled. */
  openOrders: number;
  valueAfn: number;
  valueInr: number;
}

async function count(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count: n, error } = await query;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

/**
 * Real counts and totals read through RLS, so it works for admins and CRM staff and
 * fails (rather than showing made-up numbers) for anyone else.
 */
export async function loadBusinessSummary(): Promise<BusinessSummary> {
  const head = { count: "exact", head: true } as const;
  const [accounts, approvedSellers, pendingSellers, products, orders, openOrders, values] = await Promise.all([
    count(supabase.from("profiles").select("id", head)),
    count(supabase.from("seller_profiles").select("id", head).eq("approval_status", "approved")),
    count(supabase.from("seller_profiles").select("id", head).eq("approval_status", "pending")),
    count(supabase.from("products").select("id", head)),
    count(supabase.from("orders").select("id", head)),
    count(supabase.from("orders").select("id", head).not("status", "in", "(delivered,cancelled)")),
    supabase.from("orders").select("total_afn, total_inr").neq("status", "cancelled"),
  ]);
  if (values.error) throw new Error(values.error.message);
  const rows = values.data ?? [];
  return {
    accounts,
    approvedSellers,
    pendingSellers,
    products,
    orders,
    openOrders,
    valueAfn: rows.reduce((s, r) => s + Number(r.total_afn), 0),
    valueInr: rows.reduce((s, r) => s + Number(r.total_inr), 0),
  };
}
