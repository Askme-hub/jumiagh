import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Package, ShoppingBag, Mail, Store, ArrowDownToLine, LayoutGrid, Image as ImageIcon, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceShell, type WorkspaceItem } from "@/components/WorkspaceShell";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [
    { title: "Admin Workspace — Kivora Ghana" },
    { name: "description", content: "Kivora marketplace operations and administration workspace." },
    { property: "og:title", content: "Admin Workspace — Kivora Ghana" },
    { property: "og:description", content: "Kivora marketplace operations workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
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
  const tabs: WorkspaceItem[] = [
    { to: "/admin" as const, label: "Overview", icon: Gauge, exact: true },
    { to: "/admin/products" as const, label: "Products", icon: Package },
    { to: "/admin/categories" as const, label: "Categories", icon: LayoutGrid },
    { to: "/admin/banners" as const, label: "Banners", icon: ImageIcon },
    { to: "/admin/orders" as const, label: "Orders", icon: ShoppingBag },
    { to: "/admin/sellers" as const, label: "Sellers", icon: Store },
    { to: "/admin/withdrawals" as const, label: "Payouts", icon: ArrowDownToLine },
    { to: "/admin/messages" as const, label: "Messages", icon: Mail },
  ];

  return (
    <WorkspaceShell role="Admin workspace" title="Kivora Control" subtitle="Marketplace operations" items={tabs} tone="admin">
      <Outlet />
    </WorkspaceShell>
  );
}
