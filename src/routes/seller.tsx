import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Boxes, LayoutDashboard, Receipt, Settings } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import type { NavItem } from "@/types";

const sellerNav: NavItem[] = [
  { label: "Overview", to: "/seller", icon: LayoutDashboard, exact: true },
  { label: "Inventory", to: "/seller/inventory", icon: Boxes },
  { label: "Payouts", to: "/seller/payouts", icon: Receipt },
  { label: "Settings", to: "/seller/settings", icon: Settings },
];

export const Route = createFileRoute("/seller")({
  component: SellerDashboardLayout,
});

function SellerDashboardLayout() {
  return (
    <DashboardLayout workspace="Seller portal" items={sellerNav}>
      <Outlet />
    </DashboardLayout>
  );
}
