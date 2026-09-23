import { Link } from "@tanstack/react-router";
import { ImageOff, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPrice, isAvailable, type Product } from "@/lib/catalog";

export function ProductCard({
  product,
  imageUrl,
  storeName,
  categoryName,
}: {
  product: Product;
  imageUrl?: string;
  storeName?: string;
  categoryName?: string;
}) {
  const available = isAvailable(product);
  return (
    <Link to="/products/$productId" params={{ productId: product.id }} className="group">
      <Card className="h-full overflow-hidden shadow-none transition-colors group-hover:border-primary/40">
        <div className="aspect-[4/3] bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-6" />
            </div>
          )}
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
            <span className="truncate">{storeName ?? "AfghanBazaar seller"}</span>
            <span className="flex shrink-0 items-center gap-1">
              <MapPin className="size-3" />
              {product.country_of_origin}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
