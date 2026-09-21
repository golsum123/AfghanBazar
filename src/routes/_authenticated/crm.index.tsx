import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/crm/")({
  head: () => ({
    meta: [
      { title: "CRM workspace — AfghanBazaar" },
      { name: "description", content: "Protected CRM workspace for AfghanBazaar support staff." },
      { property: "og:title", content: "CRM workspace — AfghanBazaar" },
      {
        property: "og:description",
        content: "Protected CRM workspace for AfghanBazaar support staff.",
      },
    ],
  }),
  component: CrmOverview,
});

function CrmOverview() {
  return (
    <>
      <PageHeader
        title="CRM workspace"
        description="Reserved for CRM staff. Customer relationship tools arrive in a later phase."
      />
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Support desk</CardTitle>
          <CardDescription>Access is limited to CRM staff and admins.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Nothing here yet"
            description="Tickets, customer notes and outreach tools will appear in this workspace."
          />
        </CardContent>
      </Card>
    </>
  );
}
