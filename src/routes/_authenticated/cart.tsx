import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ImageOff, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PublicLayout } from "@/layouts/public-layout";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { fetchProductsWithCovers, formatPrice, isAvailable, type Currency, type Product } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — AfghanBazaar" },
      { name: "description", content: "Review the products in your AfghanBazaar cart." },
      { property: "og:title", content: "Your cart — AfghanBazaar" },
      { property: "og:description", content: "Review the products in your cart." },
    ],
  }),
  component: CartPage,
});

interface Line {
  id: string;
  quantity: number;
  product: Product | undefined;
  cover: string | undefined;
}

function CartPage() {
  const { user } = useAuth();
  const { refresh } = useCart();
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cart_items")
      .select("id, quantity, product_id")
      .eq("user_id", user.id)
      .order("created_at");
    const rows = data ?? [];
    const { products, covers } = await fetchProductsWithCovers(rows.map((r) => r.product_id));
    setLines(rows.map((r) => ({ id: r.id, quantity: r.quantity, product: products[r.product_id], cover: covers[r.product_id] })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setQty(line: Line, qty: number) {
    if (!line.product) return;
    if (qty > line.product.stock_quantity) {
      toast.error(`Only ${line.product.stock_quantity} in stock`);
      return;
    }
    setPending(line.id);
    const { error } =
      qty < 1
        ? await supabase.from("cart_items").delete().eq("id", line.id)
        : await supabase.from("cart_items").update({ quantity: qty }).eq("id", line.id);
    setPending(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLines((prev) => (qty < 1 ? prev.filter((l) => l.id !== line.id) : prev.map((l) => (l.id === line.id ? { ...l, quantity: qty } : l))));
    void refresh();
  }

  const totals: Partial<Record<Currency, number>> = {};
  for (const l of lines) {
    if (!l.product || !isAvailable(l.product)) continue;
    totals[l.product.currency] = (totals[l.product.currency] ?? 0) + Number(l.product.price) * l.quantity;
  }
  const itemCount = lines.reduce((s, l) => s + (l.product && isAvailable(l.product) ? l.quantity : 0), 0);

  return (
    <PublicLayout>
      <section className="container-page py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
        <div className="mt-8">
          {loading ? (
            <LoadingState label="Loading your cart…" />
          ) : lines.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="size-5" />}
              title="Your cart is empty"
              description="Browse the marketplace and add products you like."
              action={<Button asChild><Link to="/marketplace">Browse marketplace</Link></Button>}
            />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="space-y-3">
                {lines.map((l) => {
                  const p = l.product;
                  const available = p ? isAvailable(p) : false;
                  return (
                    <Card key={l.id} className="shadow-none">
                      <CardContent className="flex gap-4 p-4">
                        <div className="size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                          {l.cover ? (
                            <img src={l.cover} alt={p?.name ?? ""} className="size-full object-cover" />
                          ) : (
                            <div className="flex size-full items-center justify-center text-muted-foreground"><ImageOff className="size-5" /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {p ? (
                            <Link to="/products/$productId" params={{ productId: p.id }} className="font-medium hover:underline">{p.name}</Link>
                          ) : (
                            <p className="font-medium text-muted-foreground">Product no longer available</p>
                          )}
                          {p ? <p className="text-sm text-muted-foreground">{formatPrice(p.price, p.currency)} each</p> : null}
                          {p && !available ? <p className="text-sm text-destructive">Currently out of stock</p> : null}
                          <div className="mt-3 flex items-center gap-2">
                            <Button variant="outline" size="icon" className="size-8" disabled={pending === l.id || !p} onClick={() => void setQty(l, l.quantity - 1)} aria-label="Decrease quantity"><Minus className="size-3" /></Button>
                            <span className="w-8 text-center text-sm font-medium">{l.quantity}</span>
                            <Button variant="outline" size="icon" className="size-8" disabled={pending === l.id || !p || !available || l.quantity >= (p?.stock_quantity ?? 0)} onClick={() => void setQty(l, l.quantity + 1)} aria-label="Increase quantity"><Plus className="size-3" /></Button>
                            <Button variant="ghost" size="icon" className="ml-auto size-8" disabled={pending === l.id} onClick={() => void setQty(l, 0)} aria-label="Remove item"><Trash2 className="size-4" /></Button>
                          </div>
                        </div>
                        {p ? <p className="shrink-0 font-semibold">{formatPrice(Number(p.price) * l.quantity, p.currency)}</p> : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Card className="h-fit shadow-none">
                <CardHeader><CardTitle className="text-base">Order summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>{itemCount}</span></div>
                  <Separator />
                  {(Object.entries(totals) as [Currency, number][]).map(([cur, amt]) => (
                    <div key={cur} className="flex justify-between font-semibold"><span>Total ({cur})</span><span>{formatPrice(amt, cur)}</span></div>
                  ))}
                  <Button className="w-full" disabled>Checkout coming soon</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
