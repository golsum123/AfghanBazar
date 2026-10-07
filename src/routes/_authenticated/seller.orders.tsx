import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/catalog";
import { ORDER_STATUS_LABEL, orderNumber, statusVariant, type Order, type OrderItem } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/seller/orders")({
  head: () => ({
    meta: [
      { title: "Orders — AfghanBazaar Seller Portal" },
      { name: "description", content: "View orders containing products from your store." },
      { property: "og:title", content: "Orders — AfghanBazaar Seller Portal" },
      { property: "og:description", content: "View orders containing products from your store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellerOrdersPage,
});

function itemTotals(items: OrderItem[]) {
  const byCurrency = new Map<string, number>();
  for (const i of items) {
    byCurrency.set(i.currency, (byCurrency.get(i.currency) ?? 0) + Number(i.unit_price) * i.quantity);
  }
  const parts = [...byCurrency.entries()].map(([c, v]) => formatPrice(v, c as "AFN" | "INR"));
  return parts.join(" + ") || "—";
}

function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Map<string, OrderItem[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Order | null>(null);

  useEffect(() => {
    async function load() {
      const { data: orderRows, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const rows = orderRows ?? [];
      setOrders(rows);
      if (rows.length > 0) {
        const { data: itemRows, error: itemsError } = await supabase
          .from("order_items")
          .select("*")
          .in("order_id", rows.map((o) => o.id))
          .order("created_at");
        if (itemsError) toast.error(itemsError.message);
        const map = new Map<string, OrderItem[]>();
        for (const i of itemRows ?? []) {
          const list = map.get(i.order_id) ?? [];
          list.push(i);
          map.set(i.order_id, list);
        }
        setItemsByOrder(map);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const openItems = open ? (itemsByOrder.get(open.id) ?? []) : [];

  return (
    <>
      <PageHeader title="Orders" description="Customer orders that include products from your store." />
      {loading ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package className="size-5" />}
          title="No orders yet"
          description="Orders containing your products will appear here."
        />
      ) : (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Your items</TableHead>
                  <TableHead>Your total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const items = itemsByOrder.get(o.id) ?? [];
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{orderNumber(o.id)}</TableCell>
                      <TableCell>{o.full_name}</TableCell>
                      <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{items.length}</TableCell>
                      <TableCell>{itemTotals(items)}</TableCell>
                      <TableCell><Badge variant={statusVariant(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setOpen(o)}>View</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        <DialogContent className="max-w-lg">
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle>Order {orderNumber(open.id)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={statusVariant(open.status)}>{ORDER_STATUS_LABEL[open.status]}</Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="font-medium">Your items in this order</p>
                  {openItems.length === 0 ? (
                    <p className="text-muted-foreground">No items from your store.</p>
                  ) : (
                    openItems.map((i) => (
                      <div key={i.id} className="flex justify-between gap-3">
                        <span>{i.product_name} × {i.quantity}</span>
                        <span>{formatPrice(Number(i.unit_price) * i.quantity, i.currency)}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between font-semibold">
                    <span>Your total</span>
                    <span>{itemTotals(openItems)}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="font-medium">Delivery information</p>
                  <p>{open.full_name}</p>
                  <p>{open.phone}</p>
                  <p>{open.address}</p>
                  <p>{open.city}, {open.country}</p>
                  {open.delivery_method ? <p className="pt-1">Method: {open.delivery_method}</p> : null}
                  {open.tracking_number ? <p>Tracking: {open.tracking_number}</p> : null}
                  {open.estimated_delivery_date ? (
                    <p>Estimated delivery: {new Date(open.estimated_delivery_date).toLocaleDateString()}</p>
                  ) : null}
                  <p className="pt-1 text-muted-foreground">Placed {new Date(open.created_at).toLocaleString()}</p>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
