import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/types";

/**
 * Renders children only when the signed-in user holds one of the allowed roles.
 * Admins are treated as having access to every workspace.
 */
export function RequireRole({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { loading, roles } = useAuth();

  if (loading) {
    return <LoadingState label="Checking your access…" />;
  }

  const permitted = roles.includes("admin") || allow.some((role) => roles.includes(role));

  if (!permitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <ShieldAlert className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-xl font-semibold">Access restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn&apos;t have permission to open this workspace.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/">Go home</Link>
            </Button>
            <Button asChild>
              <Link to="/dashboard">My dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
