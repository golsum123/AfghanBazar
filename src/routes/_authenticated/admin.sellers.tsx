import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingState, Spinner } from "@/components/common/states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { SellerProfile } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/sellers")({
  head: () => ({
    meta: [
      { title: "Seller applications — AfghanBazaar Admin" },
      { name: "description", content: "Review, approve or reject seller store applications." },
      { property: "og:title", content: "Seller applications — AfghanBazaar Admin" },
      {
        property: "og:description",
        content: "Review, approve or reject seller store applications.",
      },
    ],
  }),
  component: SellerApplicationsPage,
});

type Decision = "approved" | "rejected";
type Filter = "pending" | "approved" | "rejected" | "all";
interface Applicant {
  full_name: string | null;
  email: string | null;
}
type Row = SellerProfile & { applicant: Applicant | null };

const STATUS_VARIANT = {
  pending: "outline",
  approved: "secondary",
  rejected: "destructive",
} as const;

function SellerApplicationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ row: Row; decision: Decision } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const { data: stores, error } = await supabase
      .from("seller_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setFailed(true);
      setLoading(false);
      return;
    }
    const ids = (stores ?? []).map((s) => s.user_id);
    const people: Record<string, Applicant> = {};
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      for (const p of profiles ?? []) people[p.id] = { full_name: p.full_name, email: p.email };
    }
    setRows((stores ?? []).map((s) => ({ ...s, applicant: people[s.user_id] ?? null })));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.approval_status === "pending").length,
      approved: rows.filter((r) => r.approval_status === "approved").length,
      rejected: rows.filter((r) => r.approval_status === "rejected").length,
      all: rows.length,
    }),
    [rows],
  );
  const visible = filter === "all" ? rows : rows.filter((r) => r.approval_status === filter);

  async function decide() {
    if (!confirm) return;
    const { row, decision } = confirm;
    setConfirm(null);
    setBusyId(row.id);
    // select() returns the updated row; row-level security silently updates nothing for non-admins,
    // so an empty result must be treated as a failure rather than a success.
    const { data, error } = await supabase
      .from("seller_profiles")
      .update({ approval_status: decision })
      .eq("id", row.id)
      .select("id, approval_status");
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data || data.length === 0 || data[0]?.approval_status !== decision) {
      toast.error(
        "The change was not saved. You may not have permission to review seller applications.",
      );
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, approval_status: decision } : r)));
    toast.success(`${row.store_name} ${decision}`);
  }

  return (
    <>
      <PageHeader
        title="Seller applications"
        description="Sellers can list products only after you approve their store."
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <LoadingState label="Loading seller applications…" />
      ) : failed ? (
        <ErrorState title="Couldn't load seller applications" onRetry={() => void load()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Store className="size-5" />}
          title={filter === "pending" ? "No pending applications" : "No stores in this list"}
          description="New store applications appear here as soon as a seller submits their store profile."
        />
      ) : (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.applicant?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.applicant?.email || "—"}
                      </div>
                      {r.phone ? (
                        <div className="text-xs text-muted-foreground">{r.phone}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium">{r.store_name}</div>
                      {r.description ? (
                        <div className="line-clamp-2 text-xs text-muted-foreground">
                          {r.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{[r.city, r.country].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.approval_status]}>{r.approval_status}</Badge>
                    </TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap text-right">
                      {busyId === r.id ? (
                        <Spinner className="ml-auto inline-block" />
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={r.approval_status === "rejected" || busyId !== null}
                            onClick={() => setConfirm({ row: r, decision: "rejected" })}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            disabled={r.approval_status === "approved" || busyId !== null}
                            onClick={() => setConfirm({ row: r, decision: "approved" })}
                          >
                            Approve
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.decision === "approved" ? "Approve" : "Reject"} {confirm?.row.store_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.decision === "approved"
                ? "The seller will be able to list products, and their approved products become visible to shoppers."
                : "The seller will not be able to manage products, and any products they already listed are hidden from shoppers."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void decide()}>
              {confirm?.decision === "approved" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
