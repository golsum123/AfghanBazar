import { createFileRoute } from "@tanstack/react-router";
import { PackageSearch } from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — AfghanBazaar" },
      {
        name: "description",
        content:
          "Browse Afghan and Indian products on AfghanBazaar. Catalogue arrives in the next build phase.",
      },
      { property: "og:title", content: "Marketplace — AfghanBazaar" },
      {
        property: "og:description",
        content: "Browse Afghan and Indian products on AfghanBazaar.",
      },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  return (
    <PublicLayout>
      <section className="container-page py-14">
        <Badge variant="secondary">Phase 2</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Marketplace</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The product catalogue, search, filtering and cart will be built on top of this
          foundation.
        </p>

        <div className="mt-10">
          <EmptyState
            icon={<PackageSearch className="size-5" />}
            title="No products listed yet"
            description="Product listings are not part of Phase 1. This screen shows the reusable empty-state component."
          />
        </div>
      </section>
    </PublicLayout>
  );
}
