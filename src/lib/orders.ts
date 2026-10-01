import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];

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
