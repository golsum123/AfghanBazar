import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  CURRENCIES,
  ORIGINS,
  STATUSES,
  STATUS_LABEL,
  fetchCategories,
  formatPrice,
  uploadProductImages,
  type Category,
  type Currency,
  type Origin,
  type Product,
  type ProductStatus,
} from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/seller/inventory")({
  head: () => ({
    meta: [
      { title: "Products — AfghanBazaar Seller" },
      { name: "description", content: "Create and manage your AfghanBazaar product listings." },
      { property: "og:title", content: "Products — AfghanBazaar Seller" },
      { property: "og:description", content: "Manage your product listings." },
    ],
  }),
  component: InventoryPage,
});

const EMPTY = {
  name: "",
  description: "",
  price: "",
  currency: "AFN" as Currency,
  country_of_origin: "Afghanistan" as Origin,
  stock_quantity: "0",
  weight: "",
  category_id: "",
};

function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState<File[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    setProducts(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
    void fetchCategories().then(setCategories).catch(() => undefined);
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const price = Number(form.price);
    const stock = Number.parseInt(form.stock_quantity, 10);
    if (!form.name.trim() || !(price >= 0) || !(stock >= 0)) { toast.error("Check name, price and stock"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("products")
      .insert({
        seller_id: user.id,
        name: form.name.trim(),
        description: form.description || null,
        price,
        currency: form.currency,
        country_of_origin: form.country_of_origin,
        stock_quantity: stock,
        weight: form.weight ? Number(form.weight) : null,
        category_id: form.category_id || null,
        status: stock > 0 ? "active" : "out_of_stock",
      })
      .select()
      .single();
    if (error) {
      setSaving(false);
      { toast.error(error.message); return; }
    }
    try {
      await uploadProductImages(user.id, data.id, files);
    } catch (err) {
      toast.error(`Product saved, but an image failed to upload: ${(err as Error).message}`);
    }
    setSaving(false);
    setOpen(false);
    setForm(EMPTY);
    setFiles([]);
    toast.success("Product created");
    void load();
  }

  async function setStatus(id: string, status: ProductStatus) {
    const { error } = await supabase.from("products").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    const { data: imgs } = await supabase.from("product_images").select("storage_path").eq("product_id", id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (imgs?.length) await supabase.storage.from("product-images").remove(imgs.map((i) => i.storage_path));
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Product deleted");
  }

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader
        title="Products"
        description="Your listings. Active products show in the marketplace once your store is approved."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4" /> Add product</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
              <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="pname">Name</Label>
                  <Input id="pname" value={form.name} onChange={(e) => set("name")(e.target.value)} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="pdesc">Description</Label>
                  <Textarea id="pdesc" value={form.description} onChange={(e) => set("description")(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price")(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={set("currency")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Country of origin</Label>
                  <Select value={form.country_of_origin} onValueChange={set("country_of_origin")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ORIGINS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={set("category_id")}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock quantity</Label>
                  <Input id="stock" type="number" min="0" step="1" value={form.stock_quantity} onChange={(e) => set("stock_quantity")(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input id="weight" type="number" min="0" step="0.001" value={form.weight} onChange={(e) => set("weight")(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="images">Images</Label>
                  <Input id="images" type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                  <p className="text-xs text-muted-foreground">Up to 5 MB each. The first image is the cover.</p>
                </div>
                <DialogFooter className="sm:col-span-2">
                  <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create product"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <LoadingState label="Loading products…" />
      ) : (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <EmptyState className="rounded-none border-0" title="No products yet" description="Add your first product to get started." />
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link to="/products/$productId" params={{ productId: p.id }} className="font-medium hover:underline">
                          {p.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{p.country_of_origin}</div>
                      </TableCell>
                      <TableCell>{p.stock_quantity}</TableCell>
                      <TableCell>{formatPrice(p.price, p.currency)}</TableCell>
                      <TableCell>
                        <Select value={p.status} onValueChange={(v) => void setStatus(p.id, v as ProductStatus)}>
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => void remove(p.id)} aria-label="Delete product">
                          <Trash2 className="size-4" />
                        </Button>
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
