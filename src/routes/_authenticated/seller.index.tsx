import { createFileRoute } from "@tanstack/react-router";
import { Boxes, LineChart, Receipt, Store } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/seller/")({
  head: () => ({
    meta: [
      { title: "Seller portal — AfghanBazaar" },
      { name: "description", content: "Manage your AfghanBazaar shop, inventory and payouts." },
      { property: "og:title", content: "Seller portal — AfghanBazaar" },
      { property: "og:description", content: "Manage your AfghanBazaar shop and payouts." },
    ],
  }),
  component: SellerOverview,
});

function SellerOverview() {
  return (
    <>
      <PageHeader
        title="Shop overview"
        description="Performance across your Afghan and Indian listings."
        actions={<Button variant="outline">Shop profile</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Listings" value="0" hint="Published products" icon={Boxes} />
        <StatCard label="Orders" value="0" hint="Last 30 days" icon={Store} />
        <StatCard label="Revenue" value="0.00" hint="Last 30 days" icon={LineChart} />
        <StatCard label="Pending payout" value="0.00" hint="Next cycle" icon={Receipt} />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Sales activity</CardTitle>
          <CardDescription>Charts and order flow come with the commerce phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No sales data yet"
            description="Once listings and orders exist, your performance shows up here."
          />
        </CardContent>
      </Card>
    </>
  );
}
