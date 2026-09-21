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

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  head: () => ({
    meta: [
      { title: "My orders — AfghanBazaar" },
      { name: "description", content: "Track your AfghanBazaar orders and shipments." },
      { property: "og:title", content: "My orders — AfghanBazaar" },
      { property: "og:description", content: "Track your AfghanBazaar orders and shipments." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <>
      <PageHeader
        title="Orders"
        description="Order management is built in a later phase — this is the table shell."
        actions={<Badge variant="secondary">Phase 3</Badge>}
      />

      <Card className="shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="p-0">
                  <EmptyState
                    className="rounded-none border-0"
                    title="No orders yet"
                    description="Your purchases will be listed here with live shipment status."
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
