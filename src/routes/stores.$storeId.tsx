import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Phone, Store } from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ProductCard } from "@/components/catalog/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { signImagePaths, type Product, type SellerProfile } from "@/lib/catalog";

export const Route = createFileRoute("/stores/$storeId")({
  head: () => ({
    meta: [
      { title: "Seller store — AfghanBazaar" },
      { name: "description", content: "Browse an approved AfghanBazaar seller's store and their available products." },
      { property: "og:title", content: "Seller store — AfghanBazaar" },
      { property: "og:description", content: "Shop authentic Afghan and Indian products directly from this seller." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StorePage,
});

type Row = Product & { categories: { name: string } | null };

function StorePage() {
  const { storeId } = Route.useParams();
  const [store, setStore] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Row[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      // Only approved stores are returned (enforced by database rules too).
      const { data: s } = await supabase
        .from("seller_profiles")
        .select("*")
        .eq("id", storeId)
        .eq("approval_status", "approved")
        .maybeSingle();
      if (!alive) return;
      if (!s) {
        setStore(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("products")
        .select("*, categories(name), product_images(storage_path, position)")
        .eq("seller_id", s.user_id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      const rows: Row[] = [];
      const coverPath: Record<string, string> = {};
      for (const r of data ?? []) {
        const { product_images, ...p } = r;
        rows.push(p as Row);
        const first = [...(product_images ?? [])].sort((a, b) => a.position - b.position)[0];
        if (first) coverPath[p.id] = first.storage_path;
      }
      const signed = await signImagePaths(Object.values(coverPath));
      if (!alive) return;
      const c: Record<string, string> = {};
      for (const [id, path] of Object.entries(coverPath)) if (signed[path]) c[id] = signed[path];
      setStore(s);
      setProducts(rows);
      setCovers(c);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [storeId]);

  return (
    <PublicLayout>
      <section className="container-page py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/marketplace">
            <ArrowLeft className="size-4" /> Back to marketplace
          </Link>
        </Button>
        {loading ? (
          <LoadingState />
        ) : !store ? (
          <EmptyState
            title="Store not available"
            description="This store doesn't exist or isn't open to the public."
          />
        ) : (
          <>
            <Card className="shadow-none">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.store_name} className="size-full object-cover" />
                  ) : (
                    <Store className="size-7 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-2xl font-semibold">{store.store_name}</h1>
                  <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {store.city || store.country ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-4" />
                        {[store.city, store.country].filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                    {store.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="size-4" />
                        {store.phone}
                      </span>
                    ) : null}
                  </div>
                  {store.description ? (
                    <p className="mt-3 text-sm text-muted-foreground">{store.description}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <h2 className="mb-4 mt-8 font-display text-xl font-semibold">
              Products <span className="text-muted-foreground">({products.length})</span>
            </h2>
            {products.length === 0 ? (
              <EmptyState title="No products yet" description="This store has no active products right now." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    imageUrl={covers[p.id]}
                    storeName={store.store_name}
                    categoryName={p.categories?.name}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </PublicLayout>
  );
}
