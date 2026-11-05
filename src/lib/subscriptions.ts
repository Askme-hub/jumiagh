import { Crown, Rocket, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type PlanId = "free" | "starter" | "premium";

export type Plan = {
  id: PlanId;
  name: string;
  price: number; // GH₵ / month
  tagline: string;
  commission: number; // percent
  productLimit: number | null; // null = unlimited
  featuredSlots: number;
  icon: typeof Store;
  highlight?: boolean;
  extras: string[];
  features: string[];
};

const ICONS: Record<PlanId, typeof Store> = { free: Store, starter: Rocket, premium: Crown };

export function buildFeatures(p: Pick<Plan, "productLimit" | "commission" | "featuredSlots" | "extras">) {
  return [
    p.productLimit == null ? "Unlimited products" : `Up to ${p.productLimit} products`,
    `${p.commission}% commission per sale`,
    ...(p.featuredSlots > 0 ? [`${p.featuredSlots} featured product slot${p.featuredSlots > 1 ? "s" : ""}`] : []),
    ...p.extras,
  ];
}

function make(id: PlanId, name: string, tagline: string, price: number, commission: number, productLimit: number | null, featuredSlots: number, extras: string[], highlight = false): Plan {
  const base = { id, name, tagline, price, commission, productLimit, featuredSlots, extras, highlight, icon: ICONS[id] };
  return { ...base, features: buildFeatures(base) };
}

/** Fallback used only until the admin-managed plans load. */
export const PLANS: Plan[] = [
  make("free", "Free", "Start selling at no cost", 0, 12, 10, 0, ["Standard storefront listing", "Basic sales dashboard"]),
  make("starter", "Starter", "For growing shops", 199, 8, 100, 1, ["SMS order & payout alerts", "Priority in search results"], true),
  make("premium", "Premium", "For serious brands", 500, 5, null, 5, ["SMS marketing campaigns", "Advanced analytics", "Priority seller support"]),
];

export function usePlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase.from("subscription_plans").select("*").order("sort_order");
      if (error || !data?.length) return PLANS;
      return data.map((r) =>
        make(r.id as PlanId, r.name, r.tagline ?? "", Number(r.price), Number(r.commission), r.product_limit, r.featured_slots, r.features ?? [], r.highlight),
      );
    },
    placeholderData: PLANS,
  });
}

export const getPlan = (id: PlanId | undefined | null, plans: Plan[] = PLANS): Plan =>
  plans.find((p) => p.id === (id ?? "free")) ?? plans[0];

export type SubState = { planId: PlanId; expiresAt: Date | null; daysLeft: number | null; expired: boolean };

export function subscriptionState(sub: { plan: string; status: string; expires_at: string | null } | null | undefined): SubState {
  if (!sub || sub.plan === "free") return { planId: "free", expiresAt: null, daysLeft: null, expired: false };
  const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : null;
  const active = sub.status === "active" && (daysLeft == null || daysLeft > 0);
  return { planId: active ? (sub.plan as PlanId) : "free", expiresAt, daysLeft, expired: !active };
}

export function useSellerSubscription(user: User | null | undefined) {
  return useQuery({
    queryKey: ["seller-subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("seller_subscriptions").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
}

export function useSubscriptionPayments(user: User | null | undefined) {
  return useQuery({
    queryKey: ["subscription-payments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(24);
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useSellerProductCount(user: User | null | undefined) {
  return useQuery({
    queryKey: ["seller-product-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("seller_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });
}
