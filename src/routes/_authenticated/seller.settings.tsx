import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/seller/settings")({
  head: () => ({
    meta: [
      { title: "Shop settings — AfghanBazaar Seller" },
      { name: "description", content: "Configure your AfghanBazaar shop profile and market." },
      { property: "og:title", content: "Shop settings — AfghanBazaar Seller" },
      { property: "og:description", content: "Configure your shop profile and market." },
    ],
  }),
  component: SellerSettingsPage,
});

function SellerSettingsPage() {
  return (
    <>
      <PageHeader title="Shop settings" description="Storefront identity and selling market." />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Shop profile</CardTitle>
          <CardDescription>Shown to buyers on your storefront.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="shopName">Shop name</Label>
            <Input id="shopName" placeholder="e.g. Kabul Craft House" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="market">Primary market</Label>
            <Select>
              <SelectTrigger id="market">
                <SelectValue placeholder="Select market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AF">Afghanistan</SelectItem>
                <SelectItem value="IN">India</SelectItem>
                <SelectItem value="BOTH">Both markets</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bio">Shop description</Label>
            <Textarea id="bio" rows={4} placeholder="Tell buyers about your products" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => toast.success("Shop settings saved locally for now")}>
        Save changes
      </Button>
    </>
  );
}
