import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Platform settings — AfghanBazaar Admin" },
      { name: "description", content: "Configure AfghanBazaar platform-wide settings." },
      { property: "og:title", content: "Platform settings — AfghanBazaar Admin" },
      { property: "og:description", content: "Configure platform-wide settings." },
    ],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <>
      <PageHeader title="Platform settings" description="Global configuration for the bazaar." />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Applies to both the Afghan and Indian storefronts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="platformName">Platform name</Label>
            <Input id="platformName" defaultValue="AfghanBazaar" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support email</Label>
            <Input id="supportEmail" type="email" placeholder="support@example.com" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Availability</CardTitle>
          <CardDescription>Control access while work is in progress.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="maintenance">Maintenance mode</Label>
            <Switch id="maintenance" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="registrations">Allow new seller registrations</Label>
            <Switch id="registrations" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => toast.success("Platform settings saved locally for now")}>
        Save changes
      </Button>
    </>
  );
}
