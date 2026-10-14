import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Hash,
  ImageOff,
  MapPin,
  Phone,
  Send,
  Truck,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { ErrorState } from "@/components/common/states";
import { formatPrice } from "@/lib/catalog";
import {
  ORDER_STATUS_LABEL,
  fetchOrderForCustomer,
  orderNumber,
  statusVariant,
  type OrderDetails,
} from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  validateSearch: (s: Record<string, unknown>): { placed?: boolean | undefined } => ({ placed: s["placed"] === true || s["placed"] === "true" ? true : undefined }),
  head: () => ({
    meta: [
      { title: "Track your order — AfghanBazaar" },
      { name: "description", content: "Follow your AfghanBazaar order: status, items, totals and delivery details." },
      { property: "og:title", content: "Track your order — AfghanBazaar" },
      { property: "og:description", content: "Follow your AfghanBazaar order: status, items, totals and delivery details." },
    ],
  }),
  component: OrderPage,
});

function Field({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="break-words font-medium">{value}</p>
      </div>
    </div>
  );
}

function OrderPage() {
  const { orderId } = Route.useParams();
  const { placed } = Route.useSearch();
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    fetchOrderForCustomer(orderId)
      .then((result) => {
        if (!active) return;
        setDetails(result);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId, attempt]);

  // Admins and sellers can read orders through RLS; this page is the customer's own view.
  const order = details?.order && details.order.user_id === user?.id ? details.order : null;
  const items = details?.items ?? [];
  const covers = details?.covers ?? {};
  const hasDelivery = Boolean(
    order?.delivery_method || order?.delivery_address || order?.tracking_number || order?.estimated_delivery_date,
  );

  return (
    <PublicLayout>
      <section className="container-page max-w-4xl py-10">
        {loading ? (
          <LoadingState label="Loading order…" />
        ) : failed ? (
          <ErrorState onRetry={() => setAttempt((n) => n + 1)} />
        ) : !order ? (
          <EmptyState
            title="Order not found"
            description="This order doesn't exist or isn't yours."
            action={
              <Button asChild>
                <Link to="/dashboard/orders">My orders</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Link
                to="/dashboard/orders"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                <ArrowLeft className="size-4" />
                My orders
              </Link>
              <h1 className="text-3xl font-semibold tracking-tight">Order {orderNumber(order.id)}</h1>
              <p className="text-sm text-muted-foreground">
                Placed {new Date(order.created_at).toLocaleDateString()} at{" "}
                {new Date(order.created_at).toLocaleTimeString()}
              </p>
            </div>

            {placed ? (
              <div className="flex items-start gap-3 rounded-lg border bg-card p-5">
                <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Thank you — your order is confirmed</h2>
                  <p className="text-sm text-muted-foreground">
                    Order {orderNumber(order.id)} has been saved. You can follow it from My orders.
                  </p>
                </div>
              </div>
            ) : null}

            <Card className="shadow-none">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Order status</CardTitle>
                <Badge variant={statusVariant(order.status)}>{ORDER_STATUS_LABEL[order.status]}</Badge>
              </CardHeader>
              <CardContent>
                <OrderTimeline status={order.status} />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-6">
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Ordered products</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No products are recorded for this order.</p>
                    ) : (
                      items.map((i) => {
                        const cover = i.product_id ? covers[i.product_id] : undefined;
                        return (
                          <div key={i.id} className="flex items-center gap-4">
                            <div className="size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                              {cover ? (
                                <img src={cover} alt={i.product_name} loading="lazy" className="size-full object-cover" />
                              ) : (
                                <div className="flex size-full items-center justify-center text-muted-foreground">
                                  <ImageOff className="size-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{i.product_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {i.quantity} × {formatPrice(Number(i.unit_price), i.currency)}
                              </p>
                            </div>
                            <p className="shrink-0 font-medium">
                              {formatPrice(Number(i.unit_price) * i.quantity, i.currency)}
                            </p>
                          </div>
                        );
                      })
                    )}
                    <Separator />
                    <div className="space-y-1">
                      {Number(order.total_afn) > 0 ? (
                        <div className="flex justify-between font-semibold">
                          <span>Total (AFN)</span>
                          <span>{formatPrice(Number(order.total_afn), "AFN")}</span>
                        </div>
                      ) : null}
                      {Number(order.total_inr) > 0 ? (
                        <div className="flex justify-between font-semibold">
                          <span>Total (INR)</span>
                          <span>{formatPrice(Number(order.total_inr), "INR")}</span>
                        </div>
                      ) : null}
                      {Number(order.total_afn) === 0 && Number(order.total_inr) === 0 ? (
                        <p className="text-sm text-muted-foreground">No total is recorded for this order.</p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Delivery information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Field icon={User} label="Name" value={order.full_name} />
                    <Field icon={Phone} label="Phone" value={order.phone} />
                    <Field
                      icon={MapPin}
                      label="Address"
                      value={`${order.address}, ${order.city}, ${order.country}`}
                    />
                    {order.notes ? (
                      <p className="pt-1 text-sm text-muted-foreground">Notes: {order.notes}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <Card className="h-fit shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Delivery &amp; tracking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasDelivery ? (
                    <>
                      <Field
                        icon={Truck}
                        label="Delivery method"
                        value={order.delivery_method ?? "Not set yet"}
                      />
                      <Field
                        icon={Hash}
                        label="Tracking number"
                        value={order.tracking_number ?? "Not provided yet"}
                      />
                      <Field
                        icon={CalendarDays}
                        label="Estimated delivery"
                        value={
                          order.estimated_delivery_date
                            ? new Date(order.estimated_delivery_date).toLocaleDateString()
                            : "Not provided yet"
                        }
                      />
                      {order.delivery_address ? (
                        <Field icon={MapPin} label="Delivery address" value={order.delivery_address} />
                      ) : null}
                    </>
                  ) : (
                    <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                      <Send className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Delivery method, tracking number and estimated delivery date will appear here once they are
                        added to your order.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/dashboard/orders">My orders</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/marketplace">Continue shopping</Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </PublicLayout>
  );
}