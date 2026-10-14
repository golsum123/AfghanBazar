import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchProductsWithCovers, formatPrice } from "@/lib/catalog";

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export { allowedNextStatuses } from "@/lib/order-status";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function statusVariant(s: OrderStatus): "default" | "secondary" | "destructive" | "outline" {
  if (s === "cancelled") return "destructive";
  if (s === "delivered") return "default";
  if (s === "pending") return "outline";
  return "secondary";
}

export function orderNumber(id: string) {
  return `AB-${id.slice(0, 8).toUpperCase()}`;
}

/** The steps a normal order moves through, in order. */
export const TIMELINE_STEPS: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered"];

/** Position of the current status in the timeline; -1 for pending and cancelled orders. */
export function timelineIndex(status: OrderStatus) {
  return TIMELINE_STEPS.indexOf(status);
}

/** AFN/INR totals of an order as one label, e.g. "؋ 1,200.00 AFN + ₹ 500.00 INR". */
export function orderTotals(order: Pick<Order, "total_afn" | "total_inr">) {
  const parts: string[] = [];
  if (Number(order.total_afn) > 0) parts.push(formatPrice(Number(order.total_afn), "AFN"));
  if (Number(order.total_inr) > 0) parts.push(formatPrice(Number(order.total_inr), "INR"));
  return parts.join(" + ") || "—";
}

export interface OrderDetails {
  order: Order | null;
  items: OrderItem[];
  /** Signed cover image per product id; absent when the product is no longer publicly listed. */
  covers: Record<string, string>;
}

/**
 * Loads one order with its items and item images. RLS on orders/order_items keeps
 * customers to their own orders, so nothing is filtered here beyond the id.
 */
export async function fetchOrderForCustomer(orderId: string): Promise<OrderDetails> {
  const [{ data: order, error }, { data: rows, error: itemsError }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", orderId).order("created_at"),
  ]);
  if (error) throw new Error(error.message);
  if (itemsError) throw new Error(itemsError.message);
  const items = (rows ?? []) as OrderItem[];
  const productIds = items.map((i) => i.product_id).filter((id): id is string => Boolean(id));
  const { covers } = await fetchProductsWithCovers(productIds);
  return { order: (order as Order | null) ?? null, items, covers };
}

export async function placeOrder(input: {
  full_name: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  notes: string;
}) {
  const { data, error } = await supabase.rpc("place_order", {
    _full_name: input.full_name,
    _phone: input.phone,
    _country: input.country,
    _city: input.city,
    _address: input.address,
    _notes: input.notes,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
