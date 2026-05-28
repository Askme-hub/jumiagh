import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { Package, ShoppingBag, Mail, ArrowLeft, Store } from "lucide-react";
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
    { to: "/admin/messages" as const, label: "Messages", icon: Mail },
  ];

  return (
    <div>
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Link to="/" aria-label="Back"><ArrowLeft size={22} /></Link>
        <h1 className="font-bold">Admin Panel</h1>
      </div>
      <div className="flex border-b border-border bg-card">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-semibold ${
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
