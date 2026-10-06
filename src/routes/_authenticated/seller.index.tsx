import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, CheckCircle2, Store } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ORIGINS, type Origin, type SellerProfile } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/seller/")({
  head: () => ({
    meta: [
      { title: "Seller portal — AfghanBazaar" },
      { name: "description", content: "Manage your AfghanBazaar store profile and listings." },
      { property: "og:title", content: "Seller portal — AfghanBazaar" },
      { property: "og:description", content: "Manage your AfghanBazaar store and listings." },
    ],
  }),
  component: SellerOverview,
});

const STATUS_VARIANT = { pending: "outline", approved: "secondary", rejected: "destructive" } as const;

function SellerOverview() {
  const { user } = useAuth();
  const [store, setStore] = useState<SellerProfile | null>(null);
  const [counts, setCounts] = useState({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ store_name: "", description: "", country: "" as Origin | "", city: "", phone: "" });

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [{ data: sp }, { data: prods }] = await Promise.all([
        supabase.from("seller_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("products").select("status").eq("seller_id", user.id),
      ]);
      setStore(sp ?? null);
      if (sp)
        setForm({
          store_name: sp.store_name,
          description: sp.description ?? "",
          country: sp.country ?? "",
          city: sp.city ?? "",
          phone: sp.phone ?? "",
        });
      setCounts({ total: prods?.length ?? 0, active: prods?.filter((p) => p.status === "active").length ?? 0 });
      setLoading(false);
    })();
  }, [user]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user || !form.store_name.trim()) { toast.error("Store name is required"); return; }
    setSaving(true);
    const payload = {
      store_name: form.store_name.trim(),
      description: form.description || null,
      country: form.country || null,
      city: form.city || null,
      phone: form.phone || null,
    };
    const res = store
      ? await supabase.from("seller_profiles").update(payload).eq("id", store.id).select().single()
      : await supabase.from("seller_profiles").insert({ ...payload, user_id: user.id }).select().single();
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    setStore(res.data);
    toast.success(store ? "Store profile updated" : "Store profile submitted for approval");
  }

  if (loading) return <LoadingState label="Loading your store…" />;

  return (
    <>
      <PageHeader
        title="Shop overview"
        description="Your store profile and listings."
        actions={
          <Button asChild variant="outline">
            <Link to="/seller/products">Manage products</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Listings" value={String(counts.total)} hint="All your products" icon={Boxes} />
        <StatCard label="Active" value={String(counts.active)} hint="Visible when approved" icon={CheckCircle2} />
        <StatCard label="Store status" value={store ? store.approval_status : "not set up"} hint="Approved by admins" icon={Store} />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Store profile</CardTitle>
            {store ? <Badge variant={STATUS_VARIANT[store.approval_status]}>{store.approval_status}</Badge> : null}
          </div>
          <CardDescription>
            {store
              ? store.approval_status === "approved"
                ? "Your store is live. Active products appear in the marketplace."
                : store.approval_status === "pending"
                  ? "Waiting for admin approval. Your products will appear publicly once approved."
                  : "Your store was not approved. Update your details or contact support."
              : "Create your store profile to start selling. An admin will review it."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="store_name">Store name</Label>
              <Input id="store_name" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sdesc">Description</Label>
              <Textarea id="sdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v as Origin })}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {ORIGINS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sphone">Phone</Label>
              <Input id="sphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : store ? "Save changes" : "Create store"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
