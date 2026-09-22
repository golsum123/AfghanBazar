import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { RequireRole } from "@/components/auth/require-role";
import type { NavItem } from "@/types";

const adminNav: NavItem[] = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Moderation", to: "/admin/moderation", icon: ShieldCheck },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboardLayout,
});

function AdminDashboardLayout() {
  return (
    <RequireRole allow={["admin"]}>
      <DashboardLayout workspace="Admin console" items={adminNav}>
        <Outlet />
      </DashboardLayout>
    </RequireRole>
  );
}
