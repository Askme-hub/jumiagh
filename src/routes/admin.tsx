import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Package, ShoppingBag, Mail, Store, ArrowDownToLine, LayoutGrid, Image as ImageIcon, Gauge, Wallet, TicketPercent, Zap , Crown, LifeBuoy, Truck } from "lucide-react";
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
  const { data: c } = useQuery({
    queryKey: ["admin-nav-counts"],
    refetchInterval: 60000,
    queryFn: async () => {
      const n = async (q: any) => (await q).count ?? 0;
      const [products, sellers, payouts, issues] = await Promise.all([
        n(supabase.from("products").select("id", { count: "exact", head: true }).eq("approval_status", "pending")),
        n(supabase.from("seller_profiles").select("user_id", { count: "exact", head: true }).eq("status", "pending")),
        n(supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending")),
        n(supabase.from("order_issues").select("id", { count: "exact", head: true }).eq("status", "open")),
      ]);
      return { products, sellers, payouts, issues };
    },
  });
  const tabs: WorkspaceItem[] = [
    { to: "/admin" as const, label: "Overview", icon: Gauge, exact: true, group: "Dashboard" },
    { to: "/admin/orders" as const, label: "Orders", icon: ShoppingBag, group: "Dashboard" },
    { to: "/admin/issues" as const, label: "Issues", icon: LifeBuoy, group: "Dashboard", badge: c?.issues },
    { to: "/admin/products" as const, label: "Products", icon: Package, group: "Catalogue", badge: c?.products },
    { to: "/admin/categories" as const, label: "Categories", icon: LayoutGrid, group: "Catalogue" },
    { to: "/admin/banners" as const, label: "Banners", icon: ImageIcon, group: "Catalogue" },
    { to: "/admin/sellers" as const, label: "Sellers", icon: Store, group: "Sellers", badge: c?.sellers },
    { to: "/admin/subscriptions" as const, label: "Subscriptions", icon: Crown, group: "Sellers" },
    { to: "/admin/messages" as const, label: "Messages", icon: Mail, group: "Sellers" },
    { to: "/admin/finance" as const, label: "Finance", icon: Wallet, group: "Money" },
    { to: "/admin/withdrawals" as const, label: "Payouts", icon: ArrowDownToLine, group: "Money", badge: c?.payouts },
    { to: "/admin/delivery" as const, label: "Delivery Fees", icon: Truck, group: "Money" },
    { to: "/admin/coupons" as const, label: "Coupons", icon: TicketPercent, group: "Marketing" },
    { to: "/admin/flash-sales" as const, label: "Flash Sales", icon: Zap, group: "Marketing" },
  ];

  return (
    <WorkspaceShell role="Admin workspace" title="Kivora Control" subtitle="Marketplace operations" items={tabs} tone="admin">
      <Outlet />
    </WorkspaceShell>
  );
}
