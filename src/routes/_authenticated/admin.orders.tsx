import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/catalog";
import { ORDER_STATUS_LABEL, orderNumber, statusVariant, type Order, type OrderItem, type OrderStatus } from "@/lib/orders";

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders — AfghanBazaar Admin" },
      { name: "description", content: "View and manage all customer orders on AfghanBazaar." },
      { property: "og:title", content: "Orders — AfghanBazaar Admin" },
      { property: "og:description", content: "View and manage all customer orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOrdersPage,
});

function totals(o: Order) {
  const parts: string[] = [];
  if (Number(o.total_afn) > 0) parts.push(formatPrice(Number(o.total_afn), "AFN"));
  if (Number(o.total_inr) > 0) parts.push(formatPrice(Number(o.total_inr), "INR"));
  return parts.join(" + ") || "—";
}

function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delivery, setDelivery] = useState({ method: "", address: "", tracking: "", eta: "" });
  const [savingDelivery, setSavingDelivery] = useState(false);

  useEffect(() => {
    void supabase.from("orders").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) toast.error(error.message);
      setOrders(data ?? []);
      setLoading(false);
    });
  }, []);

  async function openOrder(o: Order) {
    setOpen(o);
    setItems([]);
    setItemsLoading(true);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", o.id).order("created_at");
    setItems(data ?? []);
    setItemsLoading(false);
  }

  async function changeStatus(status: OrderStatus) {
    if (!open) return;
    setSaving(true);
    const { data, error } = await supabase.from("orders").update({ status }).eq("id", open.id).select().maybeSingle();
    setSaving(false);
    if (error || !data) { toast.error(error?.message ?? "Could not update order"); return; }
    setOpen(data);
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    toast.success(`Order marked ${ORDER_STATUS_LABEL[status]}`);
  }

  return (
    <>
      <PageHeader title="Orders" description="All customer orders across the marketplace." />
      {loading ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="size-5" />} title="No orders yet" description="Customer orders will appear here." />
      ) : (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{orderNumber(o.id)}</TableCell>
                    <TableCell>{o.full_name}</TableCell>
                    <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{totals(o)}</TableCell>
                    <TableCell><Badge variant={statusVariant(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => void openOrder(o)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                  <Select value={open.status} disabled={saving} onValueChange={(v) => void changeStatus(v as OrderStatus)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="font-medium">Items</p>
                  {itemsLoading ? <p className="text-muted-foreground">Loading…</p> : items.map((i) => (
                    <div key={i.id} className="flex justify-between gap-3">
                      <span>{i.product_name} × {i.quantity}</span>
                      <span>{formatPrice(Number(i.unit_price) * i.quantity, i.currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold"><span>Total</span><span>{totals(open)}</span></div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="font-medium">Delivery details</p>
                  <p>{open.full_name}</p>
                  <p>{open.phone}</p>
                  <p>{open.address}</p>
                  <p>{open.city}, {open.country}</p>
                  {open.notes ? <p className="pt-1 text-muted-foreground">Notes: {open.notes}</p> : null}
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
