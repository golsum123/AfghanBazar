import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes, ShoppingBag, Store, Users } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ORDER_STATUS_LABEL, orderNumber, orderTotals, statusVariant, type Order } from "@/lib/orders";
import { loadBusinessSummary, type BusinessSummary } from "@/lib/summary";

export const Route = createFileRoute("/_authenticated/crm/")({
  head: () => ({
    meta: [
      { title: "CRM workspace — AfghanBazaar" },
      { name: "description", content: "Read-only customer, seller and order overview for AfghanBazaar support staff." },
      { property: "og:title", content: "CRM workspace — AfghanBazaar" },
      { property: "og:description", content: "Read-only customer, seller and order overview." },
    ],
  }),
  component: CrmOverview,
});

function CrmOverview() {
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadBusinessSummary(),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(25),
    ])
      .then(([s, o]) => {
        if (!active) return;
        if (o.error) throw new Error(o.error.message);
        setSummary(s);
        setOrders(o.data ?? []);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        title="CRM workspace"
        description="Read-only view of customers, sellers and orders for support. Changes are made by administrators."
      />
      {failed ? (
        <ErrorState onRetry={() => window.location.reload()} />
      ) : !summary ? (
        <LoadingState label="Loading overview…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Accounts" value={String(summary.accounts)} hint="Registered profiles" icon={Users} />
            <StatCard label="Sellers" value={String(summary.approvedSellers)} hint="Approved stores" icon={Store} />
            <StatCard label="Products" value={String(summary.products)} hint="All listings" icon={Boxes} />
            <StatCard label="Open orders" value={String(summary.openOrders)} hint={`${summary.orders} in total`} icon={ShoppingBag} />
          </div>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Recent orders</CardTitle>
              <CardDescription>The 25 most recent orders, with delivery and tracking details.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <EmptyState className="rounded-none border-0" title="No orders yet" description="Orders will appear here once customers check out." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{orderNumber(o.id)}</TableCell>
                        <TableCell>{o.full_name}</TableCell>
                        <TableCell>{o.phone}</TableCell>
                        <TableCell><Badge variant={statusVariant(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge></TableCell>
                        <TableCell>{o.tracking_number ?? "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{orderTotals(o)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
