import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ImageOff, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { fetchProductsWithCovers, formatPrice, isAvailable, type Product } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/dashboard/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — AfghanBazaar" },
      { name: "description", content: "Products you saved on AfghanBazaar." },
      { property: "og:title", content: "Wishlist — AfghanBazaar" },
      { property: "og:description", content: "Products you saved on AfghanBazaar." },
    ],
  }),
  component: WishlistPage,
});

interface Item {
  productId: string;
  product: Product | undefined;
  cover: string | undefined;
}

function WishlistPage() {
  const { user } = useAuth();
  const { addToCart, toggleWishlist } = useCart();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const ids = (data ?? []).map((r) => r.product_id);
    const { products, covers } = await fetchProductsWithCovers(ids);
    setItems(ids.map((id) => ({ productId: id, product: products[id], cover: covers[id] })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moveToCart(id: string) {
    try {
      await addToCart(id, 1);
      toast.success("Added to cart");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(id: string) {
    try {
      await toggleWishlist(id);
      setItems((prev) => prev.filter((i) => i.productId !== id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Wishlist" description="Saved products across both marketplaces." />
      {loading ? (
        <LoadingState label="Loading your wishlist…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-5" />}
          title="Nothing saved yet"
          description="Tap “Save to wishlist” on any product to keep it here."
          action={<Button asChild><Link to="/marketplace">Browse marketplace</Link></Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(({ productId, product: p, cover }) => (
            <Card key={productId} className="overflow-hidden shadow-none">
              <div className="aspect-[4/3] bg-muted">
                {cover ? (
                  <img src={cover} alt={p?.name ?? ""} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground"><ImageOff className="size-6" /></div>
                )}
              </div>
              <CardContent className="space-y-3 p-4">
                {p ? (
                  <>
                    <Link to="/products/$productId" params={{ productId }} className="line-clamp-2 font-medium hover:underline">{p.name}</Link>
                    <p className="font-display font-semibold text-primary">{formatPrice(p.price, p.currency)}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">This product is no longer available.</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={!p || !isAvailable(p)} onClick={() => void moveToCart(productId)}>
                    <ShoppingCart className="size-4" /> {p && isAvailable(p) ? "Add to cart" : "Out of stock"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void remove(productId)} aria-label="Remove from wishlist">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
