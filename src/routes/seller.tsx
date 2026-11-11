import { createFileRoute, Navigate, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import {
  Package,
  Store,
  Plus,
  User,
  ShoppingBag,
  Wallet,
  Crown,
  MessageCircle,
  Star,
  TicketPercent,
  Calculator,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionAlert } from "@/components/SubscriptionAlert";
import { WorkspaceShell, type WorkspaceItem } from "@/components/WorkspaceShell";
import { useAuth } from "@/hooks/use-auth";
import { useIsSeller } from "@/hooks/use-seller";

export const Route = createFileRoute("/seller")({
  component: SellerLayout,
  head: () => ({
    meta: [
      { title: "Seller Hub — Kivora Ghana" },
      {
        name: "description",
        content: "Manage your Kivora shop, products, orders, wallet and customer messages.",
      },
      { property: "og:title", content: "Seller Hub — Kivora Ghana" },
      { property: "og:description", content: "Manage your Kivora marketplace business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
});

function SellerLayout() {
  const { user } = useAuth();
  const { data: isSeller, isLoading } = useIsSeller(user);
  const path = useRouterState({ select: (s) => s.location.pathname.replace(/\/$/, "") });

  if (!user || isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  // Not an approved seller yet: only show the registration / application status screen.
  if (!isSeller) {
    if (path.startsWith("/seller/")) return <Navigate to="/seller" replace />;
    return (
      <div className="min-h-screen bg-background py-6">
        <Outlet />
      </div>
    );
  }

  const tabs: WorkspaceItem[] = [
    // Overview
    { to: "/seller", label: "Dashboard", icon: Store, exact: true, group: "Overview", quick: true },

    // Sell
    { to: "/seller/products", label: "Products", icon: Package, group: "Sell", quick: true },
    { to: "/seller/products/new", label: "Add product", icon: Plus, group: "Sell" },
    { to: "/seller/orders", label: "Orders", icon: ShoppingBag, group: "Sell", quick: true },
    { to: "/seller/pos", label: "POS", icon: Calculator, group: "Sell", quick: true },

    // Money
    { to: "/seller/wallet", label: "Wallet", icon: Wallet, group: "Money", quick: true },
    { to: "/seller/subscription", label: "Plans", icon: Crown, group: "Money" },
    { to: "/seller/coupons", label: "Coupons", icon: TicketPercent, group: "Money" },

    // Customers
    { to: "/seller/messages", label: "Messages", icon: MessageCircle, group: "Customers" },
    { to: "/seller/reviews", label: "Reviews", icon: Star, group: "Customers" },

    // Shop
    { to: "/seller/profile", label: "Shop profile", icon: User, group: "Shop" },
  ];

  return (
    <WorkspaceShell
      role="Seller workspace"
      title="Kivora Seller"
      subtitle="Your business, one place"
      items={tabs}
    >
      <SubscriptionAlert />
      <Outlet />
    </WorkspaceShell>
  );
}
