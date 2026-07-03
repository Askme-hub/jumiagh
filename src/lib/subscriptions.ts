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
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    tagline: "Start selling at no cost",
    commission: 12,
    productLimit: 10,
    featuredSlots: 0,
    icon: Store,
    features: [
      "Up to 10 active products",
      "12% commission per sale",
      "Standard storefront listing",
      "Basic sales dashboard",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 199,
    tagline: "For growing shops",
    commission: 8,
    productLimit: 100,
    featuredSlots: 1,
    icon: Rocket,
    highlight: true,
    features: [
      "Up to 100 active products",
      "8% commission per sale",
      "1 featured product slot",
      "SMS order & payout alerts",
      "Priority in search results",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 500,
    tagline: "For serious brands",
    commission: 5,
    productLimit: null,
    featuredSlots: 5,
    icon: Crown,
    features: [
      "Unlimited products",
      "5% commission per sale",
      "5 featured product slots",
      "SMS marketing campaigns",
      "Advanced analytics",
      "Priority seller support",
    ],
  },
];

export const getPlan = (id: PlanId | undefined | null): Plan =>
  PLANS.find((p) => p.id === (id ?? "free")) ?? PLANS[0];

export function useSellerSubscription(user: User | null | undefined) {
  return useQuery({
    queryKey: ["seller-subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("seller_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
}
