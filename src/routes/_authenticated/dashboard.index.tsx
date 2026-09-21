import { createFileRoute } from "@tanstack/react-router";
import { Heart, Package, Truck, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Customer dashboard — AfghanBazaar" },
      { name: "description", content: "Your AfghanBazaar account overview." },
      { property: "og:title", content: "Customer dashboard — AfghanBazaar" },
      { property: "og:description", content: "Your AfghanBazaar account overview." },
    ],
  }),
  component: CustomerOverview,
});

function CustomerOverview() {
  return (
    <>
      <PageHeader
        title="Welcome back"
        description="Your orders, deliveries and saved items will appear here."
        actions={<Button variant="outline">Edit profile</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders" value="0" hint="All time" icon={Package} />
        <StatCard label="In transit" value="0" hint="Cross-border shipments" icon={Truck} />
        <StatCard label="Wishlist" value="0" hint="Saved products" icon={Heart} />
        <StatCard label="Store credit" value="0.00" hint="Available balance" icon={Wallet} />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Order history arrives with the commerce phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No activity yet"
            description="Once you place an order it will be tracked here."
          />
        </CardContent>
      </Card>
    </>
  );
}
