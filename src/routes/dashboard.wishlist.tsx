import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";

export const Route = createFileRoute("/dashboard/wishlist")({
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

function WishlistPage() {
  return (
    <>
      <PageHeader title="Wishlist" description="Saved products across both marketplaces." />
      <EmptyState
        icon={<Heart className="size-5" />}
        title="Nothing saved yet"
        description="Saving products becomes available once the catalogue ships."
      />
    </>
  );
}
