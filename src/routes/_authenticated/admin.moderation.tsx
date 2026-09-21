import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation — AfghanBazaar Admin" },
      { name: "description", content: "Review reported listings and sellers on AfghanBazaar." },
      { property: "og:title", content: "Moderation — AfghanBazaar Admin" },
      { property: "og:description", content: "Review reported listings and sellers." },
    ],
  }),
  component: ModerationPage,
});

function ModerationPage() {
  return (
    <>
      <PageHeader title="Moderation" description="Reported listings, reviews and shops." />
      <EmptyState
        icon={<ShieldCheck className="size-5" />}
        title="Queue is clear"
        description="Reports raised by buyers and sellers will appear here for review."
      />
    </>
  );
}
