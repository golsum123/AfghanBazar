export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

const STATUS_RANK: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
};

/**
 * Statuses an order may move to from `current`. Mirrors the database trigger
 * `guard_order_update`: forward only, cancel until delivered, nothing after delivered/cancelled.
 */
export function allowedNextStatuses(current: OrderStatus): OrderStatus[] {
  if (current === "delivered" || current === "cancelled") return [];
  const forward = (Object.keys(STATUS_RANK) as OrderStatus[]).filter(
    (s) => s !== "cancelled" && STATUS_RANK[s] > STATUS_RANK[current],
  );
  return [...forward, "cancelled"];
}
