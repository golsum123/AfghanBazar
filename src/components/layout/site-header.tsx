import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, LayoutDashboard, LogOut, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Brand } from "@/components/common/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import type { NavItem } from "@/types";

const publicNav: NavItem[] = [
  { label: "Home", to: "/", exact: true },
  { label: "Marketplace", to: "/marketplace" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export function SiteHeader() {
  const { session, profile, roles, loading, signOut } = useAuth();
  const { count: cartCount } = useCart();
  const navigate = useNavigate();
  const signedIn = Boolean(session);

  const workspacePath = roles.includes("admin")
    ? "/admin"
    : roles.includes("crm_staff")
      ? "/crm"
      : roles.includes("seller")
        ? "/seller"
        : "/dashboard";

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex">
          {publicNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
        <Button asChild variant="ghost" size="icon" className="relative" aria-label={`Cart (${cartCount} items)`}>
          <Link to="/cart">
            <ShoppingCart className="size-5" />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-5 text-primary-foreground">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>
        </Button>

        <div className="hidden items-center gap-2 md:flex">
          {loading ? null : signedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <Avatar className="size-8">
                    <AvatarFallback>
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {profile?.full_name || profile?.email || "My account"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={workspacePath}>My workspace</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings">Profile settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void handleSignOut()}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth">
                  <LayoutDashboard className="size-4" />
                  Create account
                </Link>
              </Button>
            </>
          )}
        </div>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex flex-col gap-1 p-4 pt-10">
              {publicNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.exact ?? false }}
                  activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                {signedIn ? (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link to={workspacePath}>My workspace</Link>
                    </Button>
                    <Button size="sm" onClick={() => void handleSignOut()}>
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/auth">Sign in</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link to="/auth">Create account</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
