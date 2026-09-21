import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
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

export const Route = createFileRoute("/admin/users")({
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
  return (
    <>
      <PageHeader
        title="Users"
        description="Account administration arrives alongside authentication."
        actions={<Badge variant="secondary">Phase 2</Badge>}
      />

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
              <TableRow>
                <TableCell colSpan={4} className="p-0">
                  <EmptyState
                    className="rounded-none border-0"
                    title="No accounts yet"
                    description="Registered customers and sellers will be listed here."
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
