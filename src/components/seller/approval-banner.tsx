import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tells a seller why they cannot list products yet. This is only a hint: the real gate is
 * row-level security, which rejects product writes unless the store is approved.
 */
export function SellerApprovalBanner() {
  const { user, hasRole } = useAuth();
  const [status, setStatus] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void supabase
      .from("seller_profiles")
      .select("approval_status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => active && setStatus(data?.approval_status ?? null));
    return () => {
      active = false;
    };
  }, [user]);

  // Admins browsing the seller portal have no store of their own.
  if (hasRole("admin") || status === undefined || status === "approved") return null;

  if (status === "pending") {
    return (
      <Alert>
        <Clock className="size-4" />
        <AlertTitle>Store awaiting approval</AlertTitle>
        <AlertDescription>
          An administrator needs to approve your store before you can list products.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant={status === "rejected" ? "destructive" : "default"}>
      <ShieldAlert className="size-4" />
      <AlertTitle>{status === "rejected" ? "Store not approved" : "Set up your store"}</AlertTitle>
      <AlertDescription>
        {status === "rejected"
          ? "Your store application was rejected, so products cannot be listed. Contact support if you think this is a mistake."
          : "Create your store profile on the "}
        {status === null ? (
          <Link to="/seller" className="underline">
            Overview page
          </Link>
        ) : null}
        {status === null ? " to apply for approval." : null}
      </AlertDescription>
    </Alert>
  );
}
