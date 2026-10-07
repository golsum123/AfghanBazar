import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PackageSearch, Search } from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/common/states";
import { ProductCard } from "@/components/catalog/product-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCategories,
  fetchStoreNames,
  signImagePaths,
  ORIGINS,
  type Category,
  type Product,
  type SellerProfile,
} from "@/lib/catalog";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — AfghanBazaar" },
      {
        name: "description",
        content: "Browse carpets, saffron, dried fruits, jewelry and more from Afghan and Indian sellers.",
      },
      { property: "og:title", content: "Marketplace — AfghanBazaar" },
      {
        property: "og:description",
        content: "Browse Afghan and Indian products from verified sellers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketplacePage,
});

type Sort = "newest" | "price_asc" | "price_desc";

function MarketplacePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [stores, setStores] = useState<Record<string, SellerProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [country, setCountry] = useState("all");
  const [sort, setSort] = useState<Sort>("newest");

  useEffect(() => {
    void fetchCategories().then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      let q = supabase.from("products").select("*, product_images(storage_path, position)");
      if (category !== "all") q = q.eq("category_id", category);
      if (country !== "all") q = q.eq("country_of_origin", country as Product["country_of_origin"]);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      q =
        sort === "newest"
          ? q.order("created_at", { ascending: false })
          : q.order("price", { ascending: sort === "price_asc" });
      const { data, error: err } = await q.limit(60);
      if (!active) return;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const rows = data ?? [];
      const firstImage: Record<string, string> = {};
      for (const r of rows) {
        const img = [...(r.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
        if (img) firstImage[r.id] = img.storage_path;
      }
      const [signed, storeMap] = await Promise.all([
        signImagePaths(Object.values(firstImage)),
        fetchStoreNames(rows.map((r) => r.seller_id)),
      ]);
      if (!active) return;
      const imgMap: Record<string, string> = {};
      for (const [pid, path] of Object.entries(firstImage)) if (signed[path]) imgMap[pid] = signed[path];
      setProducts(rows);
      setImages(imgMap);
      setStores(storeMap);
      setLoading(false);
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [search, category, country, sort]);

  const categoryName = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  return (
    <PublicLayout>
      <section className="container-page py-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Marketplace</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Authentic products from approved Afghan and Indian sellers.
        </p>

        <div className="mt-8 grid gap-3 md:grid-cols-[1fr_200px_170px_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name"
              className="pl-9"
              aria-label="Search products"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger aria-label="Country of origin">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {ORIGINS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-8">
          {error ? (
            <ErrorState description={error} />
          ) : loading ? (
            <SkeletonRows rows={4} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="size-5" />}
              title="No products found"
              description="Try a different search or filter. New listings appear once sellers are approved."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  imageUrl={images[p.id]}
                  storeName={stores[p.seller_id]?.store_name}
                  storeId={stores[p.seller_id]?.id}
                  categoryName={p.category_id ? categoryName[p.category_id] : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
