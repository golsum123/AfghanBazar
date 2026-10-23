import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Boxes, LayoutDashboard, Settings, ShoppingBag, Store, Users } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { RequireRole } from "@/components/auth/require-role";
import type { NavItem } from "@/types";

const adminNav: NavItem[] = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Seller Applications", to: "/admin/sellers", icon: Store },
  { label: "User Management", to: "/admin/users", icon: Users },
  { label: "Product Management", to: "/admin/products", icon: Boxes },
  { label: "Order Management", to: "/admin/orders", icon: ShoppingBag },
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
