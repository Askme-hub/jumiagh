import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Package, Store, Plus, User, ShoppingBag, Wallet, Crown, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceShell, type WorkspaceItem } from "@/components/WorkspaceShell";

export const Route = createFileRoute("/seller")({
  component: SellerLayout,
  head: () => ({ meta: [
    { title: "Seller Hub — Kivora Ghana" },
    { name: "description", content: "Manage your Kivora shop, products, orders, wallet and customer messages." },
    { property: "og:title", content: "Seller Hub — Kivora Ghana" },
    { property: "og:description", content: "Manage your Kivora marketplace business." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
});

function SellerLayout() {
  const tabs: WorkspaceItem[] = [
    { to: "/seller" as const, label: "Dashboard", icon: Store, exact: true },
    { to: "/seller/products" as const, label: "Products", icon: Package },
    { to: "/seller/orders" as const, label: "Orders", icon: ShoppingBag },
    { to: "/seller/wallet" as const, label: "Wallet", icon: Wallet },
    { to: "/seller/subscription" as const, label: "Plans", icon: Crown },
    { to: "/seller/products/new" as const, label: "Add", icon: Plus },
    { to: "/seller/profile" as const, label: "Shop", icon: User },
    { to: "/seller/messages" as const, label: "Messages", icon: MessageCircle },
  ];
  return (
    <WorkspaceShell role="Seller workspace" title="Kivora Seller" subtitle="Your business, one place" items={tabs}>
      <Outlet />
    </WorkspaceShell>
  );
}
