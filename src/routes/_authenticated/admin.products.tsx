import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  formatPrice,
  STATUSES,
  STATUS_LABEL,
  type Product,
  type ProductStatus,
} from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Products — AfghanBazaar Admin" },
      { name: "description", content: "Review every product listed on AfghanBazaar." },
      { property: "og:title", content: "Products — AfghanBazaar Admin" },
      { property: "og:description", content: "Review every product listed on AfghanBazaar." },
    ],
  }),
  component: AdminProductsPage,
});

interface Row extends Product {
  store: string;
  storeApproval: string | null;
}

function AdminProductsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const [products, stores] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("seller_profiles").select("user_id, store_name, approval_status"),
    ]);
    if (products.error || stores.error) {
      setFailed(true);
      setLoading(false);
      return;
    }
    const byUser = new Map((stores.data ?? []).map((s) => [s.user_id, s]));
    setRows(
      (products.data ?? []).map((p) => ({
        ...p,
        store: byUser.get(p.seller_id)?.store_name ?? "—",
        storeApproval: byUser.get(p.seller_id)?.approval_status ?? null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hidden = useMemo(() => rows.filter((r) => r.storeApproval !== "approved").length, [rows]);

  async function setStatus(row: Row, status: ProductStatus) {
    setBusyId(row.id);
    const { data, error } = await supabase
      .from("products")
      .update({ status })
      .eq("id", row.id)
      .select("id, status");
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast.error("The change was not saved. You may not have permission to edit products.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
    toast.success(`${row.name} set to ${STATUS_LABEL[status].toLowerCase()}`);
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Every listing on the marketplace. Products from stores that are not approved are hidden from shoppers."
      />

      {loading ? (
        <LoadingState label="Loading products…" />
      ) : failed ? (
        <ErrorState title="Couldn't load products" onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Boxes className="size-5" />}
          title="No products yet"
          description="Listings created by approved sellers appear here."
        />
      ) : (
        <>
          {hidden > 0 ? (
            <p className="text-sm text-muted-foreground">
              {hidden} listing(s) belong to stores that are not approved and are not visible to
              shoppers.
            </p>
          ) : null}
          <Card className="shadow-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        {r.store}
                        {r.storeApproval && r.storeApproval !== "approved" ? (
                          <Badge variant="outline" className="ml-2">
                            {r.storeApproval}
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatPrice(Number(r.price), r.currency)}
                      </TableCell>
                      <TableCell>{r.stock_quantity}</TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={r.status}
                          disabled={busyId === r.id}
                          onValueChange={(v) => void setStatus(r, v as ProductStatus)}
                        >
                          <SelectTrigger
                            className="ml-auto w-36"
                            aria-label={`Status of ${r.name}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
