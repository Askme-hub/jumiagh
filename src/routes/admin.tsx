import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { Package, ShoppingBag, Mail, ArrowLeft, Store, ArrowDownToLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin – Kivora" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw redirect({ to: "/" });
  },
});

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/admin/products" as const, label: "Products", icon: Package },
    { to: "/admin/orders" as const, label: "Orders", icon: ShoppingBag },
    { to: "/admin/sellers" as const, label: "Sellers", icon: Store },
    { to: "/admin/withdrawals" as const, label: "Payouts", icon: ArrowDownToLine },
    { to: "/admin/messages" as const, label: "Messages", icon: Mail },
  ];

  return (
    <div>
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-700 text-white px-4 py-5 flex items-center gap-3 shadow-md">
        <Link to="/" aria-label="Back"><ArrowLeft size={22} /></Link>
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
          <Store size={20} />
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-tight">Admin Panel</h1>
          <p className="text-xs opacity-80">Platform management</p>
        </div>
      </div>
      <div className="sticky top-14 md:top-[60px] z-30 flex gap-1 border-b border-border bg-background/95 backdrop-blur-xl px-2 py-2 overflow-x-auto scrollbar-none">
        <div className="flex gap-1 min-w-max">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                active ? "bg-foreground text-background shadow" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon size={16} /> {label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
