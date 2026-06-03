import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { Package, Store, ArrowLeft, Plus, User, ShoppingBag, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/seller")({
  component: SellerLayout,
  head: () => ({ meta: [{ title: "Seller Hub — Kivora" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
});

function SellerLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/seller" as const, label: "Dashboard", icon: Store, exact: true },
    { to: "/seller/products" as const, label: "Products", icon: Package },
    { to: "/seller/orders" as const, label: "Orders", icon: ShoppingBag },
    { to: "/seller/wallet" as const, label: "Wallet", icon: Wallet },
    { to: "/seller/products/new" as const, label: "Add", icon: Plus },
    { to: "/seller/profile" as const, label: "Shop", icon: User },
  ];
  return (
    <div>
      <div className="bg-gradient-to-r from-[#ff7a00] to-orange-600 text-white px-4 py-5 flex items-center gap-3 shadow-md">
        <Link to="/" aria-label="Back" className="md:hidden"><ArrowLeft size={22} /></Link>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Store size={20} />
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-tight">Seller Hub</h1>
          <p className="text-xs opacity-90">Manage your shop</p>
        </div>
      </div>
      <div className="sticky top-14 md:top-[60px] z-30 flex gap-1 border-b border-border bg-background/95 backdrop-blur-xl px-2 py-2 overflow-x-auto scrollbar-none">
        <div className="flex gap-1 min-w-max">
        {tabs.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? path === to : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon size={16} /> {label}
            </Link>
          );
        })}
        </div>
      </div>
      <Outlet />
    </div>
  );
}
