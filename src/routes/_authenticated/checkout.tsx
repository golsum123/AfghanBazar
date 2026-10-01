import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { PublicLayout } from "@/layouts/public-layout";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { fetchProductsWithCovers, formatPrice, isAvailable, type Currency, type Product } from "@/lib/catalog";
import { placeOrder } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — AfghanBazaar" },
      { name: "description", content: "Confirm your delivery details and place your AfghanBazaar order." },
      { property: "og:title", content: "Checkout — AfghanBazaar" },
      { property: "og:description", content: "Confirm your delivery details and place your order." },
    ],
  }),
  component: CheckoutPage,
});

interface Line { id: string; quantity: number; product: Product | undefined }

function CheckoutPage() {
  const { user, profile } = useAuth();
  const { refresh } = useCart();
  const navigate = useNavigate();
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", country: "", city: "", address: "", notes: "" });

  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      ...f,
      full_name: f.full_name || profile.full_name || "",
      phone: f.phone || profile.phone || "",
      country: f.country || profile.country || "",
      city: f.city || profile.city || "",
    }));
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.from("cart_items").select("id, quantity, product_id").eq("user_id", user.id).order("created_at");
      const rows = data ?? [];
      const { products } = await fetchProductsWithCovers(rows.map((r) => r.product_id));
      setLines(rows.map((r) => ({ id: r.id, quantity: r.quantity, product: products[r.product_id] })));
      setLoading(false);
    })();
  }, [user]);

  const unavailable = lines.some((l) => !l.product || !isAvailable(l.product) || l.quantity > l.product.stock_quantity);
  const totals: Partial<Record<Currency, number>> = {};
  for (const l of lines) if (l.product) totals[l.product.currency] = (totals[l.product.currency] ?? 0) + Number(l.product.price) * l.quantity;

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const id = await placeOrder(form);
      await refresh();
      toast.success("Order placed");
      void navigate({ to: "/orders/$orderId", params: { orderId: id }, search: { placed: true } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout>
      <section className="container-page py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <div className="mt-8">
          {loading ? (
            <LoadingState label="Loading your cart…" />
          ) : lines.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="size-5" />}
              title="Your cart is empty"
              description="Add products to your cart before checking out."
              action={<Button asChild><Link to="/marketplace">Browse marketplace</Link></Button>}
            />
          ) : (
            <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_340px]">
              <Card className="shadow-none">
                <CardHeader><CardTitle className="text-base">Delivery details</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" id="full_name"><Input id="full_name" required value={form.full_name} onChange={set("full_name")} /></Field>
                  <Field label="Phone" id="phone"><Input id="phone" required value={form.phone} onChange={set("phone")} /></Field>
                  <Field label="Country" id="country"><Input id="country" required value={form.country} onChange={set("country")} /></Field>
                  <Field label="City" id="city"><Input id="city" required value={form.city} onChange={set("city")} /></Field>
                  <div className="sm:col-span-2"><Field label="Address" id="address"><Textarea id="address" required rows={2} value={form.address} onChange={set("address")} /></Field></div>
                  <div className="sm:col-span-2"><Field label="Notes (optional)" id="notes"><Textarea id="notes" rows={3} value={form.notes} onChange={set("notes")} /></Field></div>
                </CardContent>
              </Card>
              <Card className="h-fit shadow-none">
                <CardHeader><CardTitle className="text-base">Order summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {lines.map((l) => (
                    <div key={l.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{l.product?.name ?? "Unavailable product"} × {l.quantity}</span>
                      {l.product ? <span className="shrink-0">{formatPrice(Number(l.product.price) * l.quantity, l.product.currency)}</span> : null}
                    </div>
                  ))}
                  <Separator />
                  {(Object.entries(totals) as [Currency, number][]).map(([cur, amt]) => (
                    <div key={cur} className="flex justify-between font-semibold"><span>Total ({cur})</span><span>{formatPrice(amt, cur)}</span></div>
                  ))}
                  {unavailable ? <p className="text-destructive">Some items are unavailable. Update your cart first.</p> : null}
                  <p className="text-xs text-muted-foreground">Payment is arranged on delivery for now.</p>
                  <Button type="submit" className="w-full" disabled={submitting || unavailable}>{submitting ? "Placing order…" : "Confirm order"}</Button>
                  <Button asChild variant="ghost" className="w-full"><Link to="/cart">Back to cart</Link></Button>
                </CardContent>
              </Card>
            </form>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}</div>;
}
