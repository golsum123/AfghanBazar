import { Check, ClipboardCheck, Clock, Home, Package, Truck, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { timelineIndex, type OrderStatus } from "@/lib/orders";

type StepState = "done" | "current" | "upcoming";

const STEPS: { status: OrderStatus; label: string; hint: string; icon: LucideIcon }[] = [
  { status: "confirmed", label: "Confirmed", hint: "We've received your order", icon: ClipboardCheck },
  { status: "processing", label: "Processing", hint: "Your items are being prepared", icon: Package },
  { status: "shipped", label: "Shipped", hint: "On the way to your address", icon: Truck },
  { status: "delivered", label: "Delivered", hint: "Your order has arrived", icon: Home },
];

function stepState(index: number, current: number): StepState {
  if (current < 0) return "upcoming";
  if (index < current) return "done";
  if (index === current) return "current";
  return "upcoming";
}

function StepDot({ state, icon: Icon, className }: { state: StepState; icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
        state === "done" && "border-primary bg-primary text-primary-foreground",
        state === "current" && "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20",
        state === "upcoming" && "border-border bg-muted text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      {state === "done" ? <Check className="size-4" /> : <Icon className="size-4" />}
    </span>
  );
}

/**
 * Visual order tracking: Confirmed → Processing → Shipped → Delivered.
 * The current status is highlighted; a cancelled order is shown as cancelled instead
 * of continuing the timeline.
 */
export function OrderTimeline({ status, className }: { status: OrderStatus; className?: string }) {
  const current = timelineIndex(status);
  const cancelled = status === "cancelled";
  const pending = status === "pending";

  return (
    <div className={cn("space-y-5", className)}>
      {cancelled ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">This order was cancelled</p>
            <p className="text-sm text-muted-foreground">
              Tracking stopped here, so the remaining steps will not happen.
            </p>
          </div>
        </div>
      ) : pending ? (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
          <Clock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Your order is awaiting confirmation — the first step lights up as soon as it is confirmed.
          </p>
        </div>
      ) : null}

      {/* Vertical timeline on small screens. */}
      <ol className="sm:hidden">
        {STEPS.map((step, i) => {
          const state = stepState(i, current);
          const last = i === STEPS.length - 1;
          return (
            <li key={step.status} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StepDot state={state} icon={step.icon} />
                {!last && (
                  <span className={cn("min-h-6 w-px flex-1", i < current ? "bg-primary" : "bg-border")} />
                )}
              </div>
              <div className={cn("pb-5", last && "pb-0")}>
                <p
                  className={cn(
                    "text-sm font-medium",
                    state === "upcoming" && "font-normal text-muted-foreground",
                    state === "current" && "text-primary",
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Horizontal timeline from small screens up. */}
      <ol className="hidden sm:flex">
        {STEPS.map((step, i) => {
          const state = stepState(i, current);
          return (
            <li key={step.status} className="relative flex flex-1 flex-col items-center gap-2 text-center">
              {i > 0 ? (
                <span
                  className={cn(
                    "absolute right-1/2 top-4 h-px w-full",
                    i - 1 < current ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
              <StepDot state={state} icon={step.icon} />
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    state === "upcoming" && "font-normal text-muted-foreground",
                    state === "current" && "text-primary",
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}