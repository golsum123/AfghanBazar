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

export const Route = createFileRoute("/_authenticated/seller/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — AfghanBazaar Seller" },
      { name: "description", content: "Manage stock levels for your AfghanBazaar listings." },
      { property: "og:title", content: "Inventory — AfghanBazaar Seller" },
      { property: "og:description", content: "Manage stock levels for your listings." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Product and stock management is scheduled for the next phase."
        actions={<Badge variant="secondary">Phase 2</Badge>}
      />

      <Card className="shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="p-0">
                  <EmptyState
                    className="rounded-none border-0"
                    title="No listings yet"
                    description="Add products once the catalogue module is available."
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
