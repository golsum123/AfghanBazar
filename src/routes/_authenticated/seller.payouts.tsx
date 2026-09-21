import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";

export const Route = createFileRoute("/seller/payouts")({
  head: () => ({
    meta: [
      { title: "Payouts — AfghanBazaar Seller" },
      { name: "description", content: "Review your AfghanBazaar payout history and schedule." },
      { property: "og:title", content: "Payouts — AfghanBazaar Seller" },
      { property: "og:description", content: "Review payout history and schedule." },
    ],
  }),
  component: PayoutsPage,
});

function PayoutsPage() {
  return (
    <>
      <PageHeader title="Payouts" description="Settlement history across both markets." />
      <EmptyState
        icon={<Receipt className="size-5" />}
        title="No payouts yet"
        description="Payout records appear after your first settled orders."
      />
    </>
  );
}
