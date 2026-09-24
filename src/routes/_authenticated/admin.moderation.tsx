import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { SellerProfile } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation — AfghanBazaar Admin" },
      { name: "description", content: "Review and approve seller stores on AfghanBazaar." },
      { property: "og:title", content: "Moderation — AfghanBazaar Admin" },
      { property: "og:description", content: "Review and approve seller stores." },
    ],
  }),
  component: ModerationPage,
});

function ModerationPage() {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase
      .from("seller_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSellers(data ?? []);
        setLoading(false);
      });
  }, []);

  async function decide(id: string, approval_status: "approved" | "rejected") {
    const { error } = await supabase.from("seller_profiles").update({ approval_status }).eq("id", id);
    if (error) return toast.error(error.message);
    setSellers((prev) => prev.map((s) => (s.id === id ? { ...s, approval_status } : s)));
    toast.success(`Store ${approval_status}`);
  }

  return (
    <>
      <PageHeader title="Moderation" description="Approve seller stores before their products go live." />
      {loading ? (
        <LoadingState />
      ) : sellers.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="size-5" />} title="No seller stores yet" description="New store applications appear here." />
      ) : (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.store_name}</TableCell>
                    <TableCell>{[s.city, s.country].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell><Badge variant={s.approval_status === "approved" ? "secondary" : s.approval_status === "rejected" ? "destructive" : "outline"}>{s.approval_status}</Badge></TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" disabled={s.approval_status === "rejected"} onClick={() => void decide(s.id, "rejected")}>Reject</Button>
                      <Button size="sm" disabled={s.approval_status === "approved"} onClick={() => void decide(s.id, "approved")}>Approve</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
