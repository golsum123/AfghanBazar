import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  groupRoles,
  profileRoleDrifted,
  type ApprovalStatus,
  type SellerSummary,
} from "@/lib/user-directory";
import type { AppRole, Profile } from "@/types";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — AfghanBazaar Admin" },
      { name: "description", content: "Manage customer and seller accounts on AfghanBazaar." },
      { property: "og:title", content: "Users — AfghanBazaar Admin" },
      { property: "og:description", content: "Manage customer and seller accounts." },
    ],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole[]>>({});
  const [sellers, setSellers] = useState<Record<string, SellerSummary>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("seller_profiles").select("user_id, store_name, approval_status"),
    ]).then(([p, r, s]) => {
      if (p.error || r.error || s.error) setFailed(true);
      setSellers(
        Object.fromEntries(
          (s.data ?? []).map((x) => [
            x.user_id,
            { storeName: x.store_name, approvalStatus: x.approval_status as ApprovalStatus },
          ]),
        ),
      );
      setProfiles((p.data ?? []) as Profile[]);
      setRoles(groupRoles((r.data ?? []) as { user_id: string; role: AppRole }[]));
      setLoading(false);
    });
  }, []);

  return (
    <>
      <PageHeader
        title="Users"
        description="All registered accounts. Roles come from the user_roles table only. Store and seller application status come from seller_profiles and are separate from roles; seller access needs an approved application (see Seller Applications). Admin and CRM roles are assigned in the database."
        actions={<Badge variant="secondary">{profiles.length} accounts</Badge>}
      />

      {loading ? (
        <LoadingState label="Loading accounts…" />
      ) : failed ? (
        <ErrorState title="Couldn't load accounts" onRetry={() => window.location.reload()} />
      ) : (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Seller application</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState
                        className="rounded-none border-0"
                        title="No accounts yet"
                        description="Registered customers and sellers will be listed here."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell>{p.email || "—"}</TableCell>
                      <TableCell className="space-x-1">
                        {(roles[p.id] ?? []).length === 0 ? (
                          <span className="text-muted-foreground">none</span>
                        ) : (
                          (roles[p.id] ?? []).map((r) => (
                            <Badge key={r} variant={r === "admin" ? "default" : "outline"}>
                              {r}
                            </Badge>
                          ))
                        )}
                        {profileRoleDrifted(p.role, roles[p.id] ?? []) && (
                          <Badge
                            variant="secondary"
                            title="profiles.role is display only and differs from user_roles"
                          >
                            profile: {p.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{sellers[p.id]?.storeName ?? "—"}</TableCell>
                      <TableCell>
                        {sellers[p.id] ? (
                          <Badge variant="outline">{sellers[p.id]?.approvalStatus}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
