import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/catalog";
import { ORDER_STATUS_LABEL, orderNumber, statusVariant, type Order, type OrderItem } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  validateSearch: (s: Record<string, unknown>): { placed?: boolean | undefined } => ({ placed: s["placed"] === true || s["placed"] === "true" ? true : undefined }),
  head: () => ({
    meta: [
      { title: "Order details — AfghanBazaar" },
      { name: "description", content: "View the details and status of your AfghanBazaar order." },
      { property: "og:title", content: "Order details — AfghanBazaar" },
      { property: "og:description", content: "View the details and status of your order." },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { orderId } = Route.useParams();
  const { placed } = Route.useSearch();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [{ data: o }, { data: it }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId).order("created_at"),
      ]);
      setOrder(o);
      setItems(it ?? []);
      setLoading(false);
    })();
  }, [orderId]);

  return (
    <PublicLayout>
      <section className="container-page max-w-3xl py-10">
        {loading ? (
          <LoadingState label="Loading order…" />
        ) : !order ? (
          <EmptyState title="Order not found" description="This order doesn't exist or isn't yours." action={<Button asChild><Link to="/dashboard/orders">My orders</Link></Button>} />
        ) : (
          <div className="space-y-6">
            {placed ? (
              <div className="flex items-start gap-3 rounded-lg border bg-card p-5">
                <CheckCircle2 className="mt-0.5 size-6 text-primary" />
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Thank you — your order is confirmed</h1>
                  <p className="text-sm text-muted-foreground">Order {orderNumber(order.id)} has been saved. You can follow it from My orders.</p>
                </div>
              </div>
            ) : (
              <h1 className="text-3xl font-semibold tracking-tight">Order {orderNumber(order.id)}</h1>
            )}
            <Card className="shadow-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{orderNumber(order.id)}</CardTitle>
                <Badge variant={statusVariant(order.status)}>{ORDER_STATUS_LABEL[order.status]}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {items.map((i) => (
                  <div key={i.id} className="flex justify-between gap-3">
                    <span>{i.product_name} × {i.quantity}</span>
                    <span>{formatPrice(Number(i.unit_price) * i.quantity, i.currency)}</span>
                  </div>
                ))}
                <Separator />
                {Number(order.total_afn) > 0 ? <div className="flex justify-between font-semibold"><span>Total (AFN)</span><span>{formatPrice(Number(order.total_afn), "AFN")}</span></div> : null}
                {Number(order.total_inr) > 0 ? <div className="flex justify-between font-semibold"><span>Total (INR)</span><span>{formatPrice(Number(order.total_inr), "INR")}</span></div> : null}
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader><CardTitle className="text-base">Delivery details</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{order.full_name}</p>
                <p>{order.phone}</p>
                <p>{order.address}</p>
                <p>{order.city}, {order.country}</p>
                {order.notes ? <p className="pt-2 text-muted-foreground">Notes: {order.notes}</p> : null}
                <p className="pt-2 text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p>
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button asChild><Link to="/dashboard/orders">My orders</Link></Button>
              <Button asChild variant="outline"><Link to="/marketplace">Continue shopping</Link></Button>
            </div>
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
