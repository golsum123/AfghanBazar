import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, ShieldCheck, ShoppingBag, Store, Users } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadBusinessSummary, type BusinessSummary } from "@/lib/summary";
import { formatPrice } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin console — AfghanBazaar" },
      { name: "description", content: "Platform health and operations for AfghanBazaar staff." },
      { property: "og:title", content: "Admin console — AfghanBazaar" },
      { property: "og:description", content: "Platform health and operations overview." },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setFailed(false);
    loadBusinessSummary()
      .then((s) => active && setSummary(s))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Live counts from the AfghanBazaar database."
        actions={
          summary && summary.pendingSellers > 0 ? (
            <Button asChild>
              <Link to="/admin/moderation">Review {summary.pendingSellers} pending store(s)</Link>
            </Button>
          ) : null
        }
      />

      {failed ? (
        <ErrorState onRetry={() => setAttempt((n) => n + 1)} />
      ) : !summary ? (
        <LoadingState label="Loading platform figures…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Accounts" value={String(summary.accounts)} hint="Registered profiles" icon={Users} />
            <StatCard
              label="Sellers"
              value={String(summary.approvedSellers)}
              hint={`${summary.pendingSellers} awaiting approval`}
              icon={Store}
            />
            <StatCard label="Products" value={String(summary.products)} hint="All listings" icon={Boxes} />
            <StatCard
              label="Orders"
              value={String(summary.orders)}
              hint={`${summary.openOrders} still open`}
              icon={ShoppingBag}
            />
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Order value</CardTitle>
              <CardDescription>
                Sum of placed orders that are not cancelled. Payment is collected on delivery, so this is not
                confirmed revenue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
                <span>{formatPrice(summary.valueAfn, "AFN")}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
                <span>{formatPrice(summary.valueInr, "INR")}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
