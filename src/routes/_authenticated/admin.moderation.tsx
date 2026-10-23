import { createFileRoute, redirect } from "@tanstack/react-router";

// Moderation became "Seller applications"; keep the old URL working for existing bookmarks.
export const Route = createFileRoute("/_authenticated/admin/moderation")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/sellers", replace: true });
  },
});
