import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Boxes, ClipboardList, LayoutDashboard, Receipt, Settings } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { RequireRole } from "@/components/auth/require-role";
import { SellerApprovalBanner } from "@/components/seller/approval-banner";
import type { NavItem } from "@/types";

const sellerNav: NavItem[] = [
  { label: "Overview", to: "/seller", icon: LayoutDashboard, exact: true },
  { label: "Products", to: "/seller/products", icon: Boxes },
  { label: "Orders", to: "/seller/orders", icon: ClipboardList },
  { label: "Payouts", to: "/seller/payouts", icon: Receipt },
  { label: "Settings", to: "/seller/settings", icon: Settings },
];

export const Route = createFileRoute("/_authenticated/seller")({
  component: SellerDashboardLayout,
});

function SellerDashboardLayout() {
  return (
    <RequireRole allow={["seller"]}>
      <DashboardLayout workspace="Seller portal" items={sellerNav}>
        <SellerApprovalBanner />
        <Outlet />
      </DashboardLayout>
    </RequireRole>
  );
}
