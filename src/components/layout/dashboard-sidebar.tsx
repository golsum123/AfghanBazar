import { Link } from "@tanstack/react-router";
import { Brand } from "@/components/common/brand";
import { Badge } from "@/components/ui/badge";
import type { NavItem } from "@/types";

export function DashboardSidebarNav({
  items,
  workspace,
  onNavigate,
}: {
  items: NavItem[];
  workspace: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <Brand />
      </div>

      <Badge variant="secondary" className="w-fit">
        {workspace}
      </Badge>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.exact ?? false }}
            activeProps={{
              className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary",
            }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {item.icon ? <item.icon className="size-4" /> : null}
            {item.label}
          </Link>
        ))}
      </nav>

      <Link
        to="/"
        onClick={onNavigate}
        className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        ← Back to storefront
      </Link>
    </div>
  );
}
