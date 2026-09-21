import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Headset, LayoutDashboard } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { RequireRole } from "@/components/auth/require-role";
import type { NavItem } from "@/types";

const crmNav: NavItem[] = [
  { label: "Overview", to: "/crm", icon: LayoutDashboard, exact: true },
  { label: "Support desk", to: "/crm", icon: Headset },
];

export const Route = createFileRoute("/_authenticated/crm")({
  component: CrmAreaLayout,
});

function CrmAreaLayout() {
  return (
    <RequireRole allow={["crm_staff"]}>
      <DashboardLayout workspace="CRM workspace" items={crmNav}>
        <Outlet />
      </DashboardLayout>
    </RequireRole>
  );
}
