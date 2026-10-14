import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ORDER_STATUS_LABEL, orderNumber, orderTotals, statusVariant, type Order } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  head: () => ({
    meta: [
      { title: "My orders — AfghanBazaar" },
      { name: "description", content: "Track your AfghanBazaar orders." },
      { property: "og:title", content: "My orders — AfghanBazaar" },
      { property: "og:description", content: "Track your AfghanBazaar orders." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setFailed(true);
        setOrders(data ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <>
      <PageHeader title="My orders" description="All the orders you've placed on AfghanBazaar." />
      <Card className="shadow-none">
        <CardContent className="p-0">
          {loading ? (
            <LoadingState label="Loading orders…" />
          ) : failed ? (
            <ErrorState title="Couldn't load your orders" onRetry={() => window.location.reload()} />
          ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState
                          className="rounded-none border-0"
                          title="No orders yet"
                          description="Your purchases will be listed here."
                          action={<Button asChild><Link to="/marketplace">Browse marketplace</Link></Button>}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Link to="/orders/$orderId" params={{ orderId: o.id }} className="font-medium hover:underline">{orderNumber(o.id)}</Link>
                        </TableCell>
                        <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant={statusVariant(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge></TableCell>
                        <TableCell>
                          {o.delivery_method || o.tracking_number || o.estimated_delivery_date ? (
                            <div className="space-y-0.5 text-sm">
                              {o.delivery_method ? <div>{o.delivery_method}</div> : null}
                              {o.tracking_number ? <div className="text-muted-foreground">Tracking: {o.tracking_number}</div> : null}
                              {o.estimated_delivery_date ? (
                                <div className="text-muted-foreground">Est. {new Date(o.estimated_delivery_date).toLocaleDateString()}</div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{orderTotals(o)}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link to="/orders/$orderId" params={{ orderId: o.id }}>
                              Track order
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
