import { Link, useRouterState } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getPlan, subscriptionState, usePlans, useSellerSubscription } from "@/lib/subscriptions";

/** Seller Hub banner: plan expiring soon, or expired and moved back to Free. */
export function SubscriptionAlert() {
  const { user } = useAuth();
  const { data: sub } = useSellerSubscription(user);
  const { data: plans } = usePlans();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (!sub || sub.plan === "free" || path === "/seller/subscription") return null;
  const st = subscriptionState(sub);
  const name = getPlan(sub.plan as any, plans).name;
  let text: string | null = null;
  if (st.expired) text = `Your ${name} plan has expired — your shop is back on the Free plan.`;
  else if (st.daysLeft != null && st.daysLeft <= 5)
    text = `Your ${name} plan ends in ${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"}.`;
  if (!text) return null;
  return (
    <div className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-ink">
      <AlertTriangle size={18} className="shrink-0" />
      <span className="flex-1 min-w-[180px] font-medium">{text}</span>
      <Link to="/seller/subscription" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
        Renew now
      </Link>
    </div>
  );
}
