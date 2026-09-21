import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Store, Users, Activity } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState, LoadingState, EmptyState } from "@/components/common/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/")({
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
  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Operations view for AfghanBazaar administrators."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value="0" hint="Registered accounts" icon={Users} />
        <StatCard label="Sellers" value="0" hint="Active shops" icon={Store} />
        <StatCard label="Open reports" value="0" hint="Moderation queue" icon={ShieldCheck} />
        <StatCard label="Uptime" value="100%" hint="Last 30 days" icon={Activity} />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Shared state components</CardTitle>
          <CardDescription>
            Reference for the loading, error and empty states used across all workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="loading">
            <TabsList>
              <TabsTrigger value="loading">Loading</TabsTrigger>
              <TabsTrigger value="error">Error</TabsTrigger>
              <TabsTrigger value="empty">Empty</TabsTrigger>
            </TabsList>
            <TabsContent value="loading" className="pt-4">
              <LoadingState label="Loading platform metrics…" />
            </TabsContent>
            <TabsContent value="error" className="pt-4">
              <ErrorState onRetry={() => undefined} />
            </TabsContent>
            <TabsContent value="empty" className="pt-4">
              <EmptyState />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
