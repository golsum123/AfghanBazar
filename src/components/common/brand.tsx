import { Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Store className="size-5" />
      </span>
      {!compact ? (
        <span className="font-display text-lg font-semibold tracking-tight">
          Afghan<span className="text-primary">Bazaar</span>
        </span>
      ) : null}
    </Link>
  );
}
