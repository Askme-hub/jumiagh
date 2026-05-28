import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { Package, Store, ArrowLeft, Plus, User } from "lucide-react";
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
    { to: "/seller/products/new" as const, label: "Add", icon: Plus },
    { to: "/seller/profile" as const, label: "Shop", icon: User },
  ];
  return (
    <div>
      <div className="bg-[#ff7a00] text-white px-4 py-3 flex items-center gap-3 md:rounded-b-xl">
        <Link to="/" aria-label="Back" className="md:hidden"><ArrowLeft size={22} /></Link>
        <Store size={20} />
        <h1 className="font-bold">Seller Hub</h1>
      </div>
      <div className="flex border-b border-border bg-card overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? path === to : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 min-w-[80px] py-3 flex flex-col items-center gap-0.5 text-xs font-semibold ${
                active ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={18} /> {label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
