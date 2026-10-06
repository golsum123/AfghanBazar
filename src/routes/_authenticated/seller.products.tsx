import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  CURRENCIES,
  ORIGINS,
  PRODUCT_IMAGES_BUCKET,
  STATUS_LABEL,
  fetchCategories,
  formatPrice,
  signImagePaths,
  uploadProductImages,
  type Category,
  type Currency,
  type Origin,
  type Product,
} from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/seller/products")({
  head: () => ({
    meta: [
      { title: "Products — AfghanBazaar Seller" },
      { name: "description", content: "Create and manage your AfghanBazaar product listings." },
      { property: "og:title", content: "Products — AfghanBazaar Seller" },
      { property: "og:description", content: "Manage your product listings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductsPage,
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

type Row = Product & { cover?: string | undefined; imagePaths: string[] };

function ProductsPage() {
  const { user } = useAuth();
  const [approval, setApproval] = useState<string | null | undefined>(undefined);
  const [products, setProducts] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState<File[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: store }, { data }] = await Promise.all([
      supabase.from("seller_profiles").select("approval_status").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("products")
        .select("*, product_images(storage_path, position)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    setApproval(store?.approval_status ?? null);
    const rows = (data ?? []).map(({ product_images, ...p }) => ({
      ...(p as Product),
      imagePaths: [...(product_images ?? [])].sort((a, b) => a.position - b.position).map((i) => i.storage_path),
    }));
    const signed = await signImagePaths(rows.map((r) => r.imagePaths[0]).filter(Boolean));
    setProducts(rows.map((r) => ({ ...r, cover: r.imagePaths[0] ? signed[r.imagePaths[0]] : undefined })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
    void fetchCategories().then(setCategories).catch(() => undefined);
  }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setFiles([]);
    setOpen(true);
  }

  function openEdit(p: Row) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      currency: p.currency,
      country_of_origin: p.country_of_origin,
      stock_quantity: String(p.stock_quantity),
      weight: p.weight != null ? String(p.weight) : "",
      category_id: p.category_id ?? "",
    });
    setFiles([]);
    setOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const price = Number(form.price);
    const stock = Number.parseInt(form.stock_quantity, 10);
    if (!form.name.trim() || !(price >= 0) || !(stock >= 0)) { toast.error("Check name, price and stock"); return; }
    setSaving(true);
    const fields = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      currency: form.currency,
      country_of_origin: form.country_of_origin,
      stock_quantity: stock,
      weight: form.weight ? Number(form.weight) : null,
      category_id: form.category_id || null,
    };
    let productId: string;
    if (editing) {
      // Keep inactive products inactive; otherwise derive from stock.
      const status = editing.status === "inactive" ? "inactive" : stock > 0 ? "active" : "out_of_stock";
      const { error } = await supabase.from("products").update({ ...fields, status }).eq("id", editing.id).eq("seller_id", user.id);
      if (error) { setSaving(false); toast.error(error.message); return; }
      productId = editing.id;
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert({ ...fields, seller_id: user.id, status: stock > 0 ? "active" : "out_of_stock" })
        .select("id")
        .single();
      if (error) { setSaving(false); toast.error(error.message); return; }
      productId = data.id;
    }
    if (files.length) {
      try {
        if (editing && editing.imagePaths.length) {
          // Replace existing images with the newly chosen ones.
          await supabase.from("product_images").delete().eq("product_id", productId);
          await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(editing.imagePaths);
        }
        await uploadProductImages(user.id, productId, files);
      } catch (err) {
        toast.error(`Product saved, but an image failed to upload: ${(err as Error).message}`);
      }
    }
    setSaving(false);
    setOpen(false);
    toast.success(editing ? "Product updated" : "Product created");
    void load();
  }

  async function toggleActive(p: Row, active: boolean) {
    const status = active ? (p.stock_quantity > 0 ? "active" : "out_of_stock") : "inactive";
    const { error } = await supabase.from("products").update({ status }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status } : x)));
  }

  async function remove(p: Row) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    if (p.imagePaths.length) await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(p.imagePaths);
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
    toast.success("Product deleted");
  }

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const approved = approval === "approved";
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader
        title="Products"
        description="Add, edit and publish your store's listings."
        actions={approved ? <Button onClick={openNew}><Plus className="size-4" /> Add product</Button> : undefined}
      />

      {loading ? (
        <LoadingState label="Loading products…" />
      ) : !approved ? (
        <EmptyState
          title={approval === null ? "Set up your store first" : `Store ${approval}`}
          description={
            approval === null
              ? "Create your store profile on the Overview page. Once an admin approves it, you can manage products here."
              : approval === "pending"
                ? "Your store is awaiting admin approval. You can manage products once it is approved."
                : "Your store was not approved, so products cannot be managed."
          }
          action={<Button asChild variant="outline"><Link to="/seller">Go to overview</Link></Button>}
        />
      ) : (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState className="rounded-none border-0" title="No products yet" description="Add your first product to get started." />
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                            {p.cover ? <img src={p.cover} alt={p.name} className="size-full object-cover" /> : <ImageOff className="size-4 text-muted-foreground" />}
                          </div>
                          <div>
                            <Link to="/products/$productId" params={{ productId: p.id }} className="font-medium hover:underline">{p.name}</Link>
                            <div className="text-xs text-muted-foreground">{STATUS_LABEL[p.status]}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{catName(p.category_id)}</TableCell>
                      <TableCell>{p.stock_quantity}</TableCell>
                      <TableCell>{formatPrice(p.price, p.currency)}</TableCell>
                      <TableCell>
                        <Switch checked={p.status !== "inactive"} onCheckedChange={(v) => void toggleActive(p, v)} aria-label="Active" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit product"><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => void remove(p)} aria-label="Delete product"><Trash2 className="size-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
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
              <Label htmlFor="images">{editing ? "Replace images" : "Images"}</Label>
              {editing?.cover && files.length === 0 ? (
                <img src={editing.cover} alt="Current cover" className="h-20 w-20 rounded-md border object-cover" />
              ) : null}
              <Input id="images" type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              <p className="text-xs text-muted-foreground">
                Up to 5 MB each. The first image is the cover.{editing ? " Choosing new images replaces the current ones." : ""}
              </p>
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create product"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
