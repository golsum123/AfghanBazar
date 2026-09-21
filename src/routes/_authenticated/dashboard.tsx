import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Heart, LayoutDashboard, Package, Settings } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import type { NavItem } from "@/types";

const customerNav: NavItem[] = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Orders", to: "/dashboard/orders", icon: Package },
  { label: "Wishlist", to: "/dashboard/wishlist", icon: Heart },
  { label: "Settings", to: "/dashboard/settings", icon: Settings },
];

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: CustomerDashboardLayout,
});

function CustomerDashboardLayout() {
  return (
    <DashboardLayout workspace="Customer dashboard" items={customerNav}>
      <Outlet />
    </DashboardLayout>
  );
}
