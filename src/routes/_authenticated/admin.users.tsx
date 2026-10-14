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
import type { Profile } from "@/types";

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
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]).then(([p, r]) => {
      if (p.error || r.error) setFailed(true);
      setProfiles((p.data ?? []) as Profile[]);
      const map: Record<string, string[]> = {};
      for (const row of r.data ?? []) (map[row.user_id] ??= []).push(row.role);
      setRoles(map);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <PageHeader
        title="Users"
        description="All registered accounts. Roles are granted at sign-up; admin and CRM roles are assigned in Supabase."
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
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-0">
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
                        {(roles[p.id] ?? [p.role]).map((r) => (
                          <Badge key={r} variant="outline">{r}</Badge>
                        ))}
                      </TableCell>
                      <TableCell className="text-right">{new Date(p.created_at).toLocaleDateString()}</TableCell>
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
