import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { SafeImage } from "@/components/catalog/safe-image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPrice, isAvailable, type Product } from "@/lib/catalog";

export function ProductCard({
  product,
  imageUrl,
  storeName,
  categoryName,
  storeId,
}: {
  storeId?: string | undefined;
  product: Product;
  imageUrl?: string | undefined;
  storeName?: string | undefined;
  categoryName?: string | undefined;
}) {
  const available = isAvailable(product);
  return (
    <Card className="group relative h-full overflow-hidden shadow-none transition-colors hover:border-primary/40">
        <Link
          to="/products/$productId"
          params={{ productId: product.id }}
          aria-label={product.name}
          className="absolute inset-0 z-0"
        />
        <div className="aspect-[4/3] bg-muted">
          <SafeImage src={imageUrl} alt={product.name} loading="lazy" />
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">{categoryName ?? "Uncategorised"}</span>
            <Badge variant={available ? "secondary" : "outline"}>
              {available ? "In stock" : "Out of stock"}
            </Badge>
          </div>
          <h3 className="line-clamp-2 font-medium leading-snug">{product.name}</h3>
          <p className="font-display text-lg font-semibold text-primary">
            {formatPrice(product.price, product.currency)}
          </p>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            {storeId ? (
              <Link
                to="/stores/$storeId"
                params={{ storeId }}
                className="relative z-10 truncate hover:text-primary hover:underline"
              >
                {storeName ?? "AfghanBazaar seller"}
              </Link>
            ) : (
              <span className="truncate">{storeName ?? "AfghanBazaar seller"}</span>
            )}
            <span className="flex shrink-0 items-center gap-1">
              <MapPin className="size-3" />
              {product.country_of_origin}
            </span>
          </div>
        </div>
      </Card>
  );
}
