import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ImageOff, MapPin, ShoppingCart, Store } from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  formatPrice,
  isAvailable,
  signImagePaths,
  type Category,
  type Product,
  type SellerProfile,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/$productId")({
  head: () => ({
    meta: [
      { title: "Product details — AfghanBazaar" },
      { name: "description", content: "View product details, origin and seller information on AfghanBazaar." },
      { property: "og:title", content: "Product details — AfghanBazaar" },
      { property: "og:description", content: "Authentic Afghan and Indian products on AfghanBazaar." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { productId } = Route.useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [store, setStore] = useState<SellerProfile | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("*, product_images(storage_path, position), categories(*)")
        .eq("id", productId)
        .maybeSingle();
      if (!alive) return;
      if (!data) {
        setProduct(null);
        setLoading(false);
        return;
      }
      const { product_images, categories, ...p } = data;
      const paths = [...(product_images ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((i) => i.storage_path);
      const [signed, sellerRes] = await Promise.all([
        signImagePaths(paths),
        supabase.from("seller_profiles").select("*").eq("user_id", p.seller_id).maybeSingle(),
      ]);
      if (!alive) return;
      setProduct(p as Product);
      setCategory(categories ?? null);
      setStore(sellerRes.data ?? null);
      setImages(paths.map((x) => signed[x]).filter((x): x is string => Boolean(x)));
      setActive(0);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [productId]);

  return (
    <PublicLayout>
      <section className="container-page py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6">
          <Link to="/marketplace">
            <ArrowLeft className="size-4" /> Back to marketplace
          </Link>
        </Button>

        {loading ? (
          <LoadingState label="Loading product…" />
        ) : !product ? (
          <EmptyState
            title="Product not found"
            description="This product doesn't exist or is no longer available."
          />
        ) : (
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
                {images[active] ? (
                  <img src={images[active]} alt={product.name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <ImageOff className="size-8" />
                  </div>
                )}
              </div>
              {images.length > 1 ? (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setActive(i)}
                      className={cn(
                        "aspect-square overflow-hidden rounded-md border",
                        i === active && "ring-2 ring-primary",
                      )}
                      aria-label={`Show image ${i + 1}`}
                    >
                      <img src={src} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                {category ? <Badge variant="secondary">{category.name}</Badge> : null}
                <Badge variant="outline" className="gap-1">
                  <MapPin className="size-3" /> {product.country_of_origin}
                </Badge>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">{product.name}</h1>
              <p className="mt-3 font-display text-2xl font-semibold text-primary">
                {formatPrice(product.price, product.currency)}
              </p>

              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Availability</dt>
                  <dd className="font-medium">
                    {isAvailable(product) ? `In stock (${product.stock_quantity})` : "Out of stock"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Weight</dt>
                  <dd className="font-medium">{product.weight ? `${product.weight} kg` : "—"}</dd>
                </div>
              </dl>

              <div className="mt-6">
                <Button size="lg" disabled className="w-full sm:w-auto">
                  <ShoppingCart className="size-4" /> Add to cart
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">Cart and checkout are coming soon.</p>
              </div>

              <Separator className="my-8" />
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="mt-2 whitespace-pre-line text-muted-foreground">
                {product.description || "No description provided."}
              </p>

              <Card className="mt-8 shadow-none">
                <CardContent className="flex items-start gap-3 p-5">
                  <Store className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="font-medium">{store?.store_name ?? "AfghanBazaar seller"}</p>
                    {store ? (
                      <p className="text-sm text-muted-foreground">
                        {[store.city, store.country].filter(Boolean).join(", ")}
                      </p>
                    ) : null}
                    {store?.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">{store.description}</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
