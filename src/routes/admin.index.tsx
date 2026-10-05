import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowRight, Box, CircleDollarSign, Clock, PackageCheck, ShoppingBag, Store, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatGHC } from "@/lib/store";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
  head: () => ({ meta: [
    { title: "Marketplace Overview — Kivora Admin" },
    { name: "description", content: "Monitor sellers, orders, products and payouts across Kivora Ghana." },
    { property: "og:title", content: "Marketplace Overview — Kivora Admin" },
    { property: "og:description", content: "Kivora marketplace performance and operations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function AdminOverview() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [products, sellers, orders, withdrawals] = await Promise.all([
        supabase.from("products").select("id, approval_status", { count: "exact" }).limit(5),
        supabase.from("seller_profiles").select("user_id, shop_name, status, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(4),
        supabase.from("orders").select("id, total_amount, status, created_at, order_number", { count: "exact" }).order("created_at", { ascending: false }).limit(4),
        supabase.from("withdrawal_requests").select("id", { count: "exact" }).eq("status", "pending").limit(1),
      ]);
      return {
        productCount: products.count ?? 0,
        pendingProducts: products.data?.filter((item) => item.approval_status === "pending").length ?? 0,
        sellerCount: sellers.count ?? 0,
        pendingSellers: sellers.data?.filter((item) => item.status === "pending").length ?? 0,
        orderCount: orders.count ?? 0,
        pendingPayouts: withdrawals.count ?? 0,
        recentSellers: sellers.data ?? [],
        recentOrders: orders.data ?? [],
      };
    },
  });

  const stats = [
    { label: "Total sellers", value: data?.sellerCount ?? 0, detail: `${data?.pendingSellers ?? 0} awaiting review`, icon: Users },
    { label: "Products", value: data?.productCount ?? 0, detail: `${data?.pendingProducts ?? 0} in approval queue`, icon: Box },
    { label: "Orders", value: data?.orderCount ?? 0, detail: "Across the marketplace", icon: ShoppingBag },
    { label: "Pending payouts", value: data?.pendingPayouts ?? 0, detail: "Requires admin action", icon: ArrowDownToLine },
  ];

  return (
    <div className="dashboard-canvas p-4 md:p-6">
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary">MARKETPLACE CONTROL</p>
          <h1 className="mt-1 truncate font-display text-2xl font-bold md:text-3xl">Good day, Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is what needs attention across Kivora.</p>
        </div>
        <Link to="/admin/products" className="hidden items-center gap-2 text-sm font-bold text-primary sm:flex">Review queue <ArrowRight size={16} /></Link>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="dashboard-stat">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary"><Icon size={19} /></div>
            <p className="mt-5 font-display text-2xl font-bold">{value}</p>
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.75fr)]">
        <section className="dashboard-panel">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-primary">LIVE OPERATIONS</p><h2 className="font-display text-xl font-bold">Recent orders</h2></div><Link to="/admin/orders" className="text-xs font-bold text-primary">View all</Link></div>
          <div className="mt-4 divide-y divide-border">
            {(data?.recentOrders ?? []).map((order) => (
              <div key={order.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted"><PackageCheck size={18} /></div>
                <div className="min-w-0"><p className="truncate text-sm font-bold">Order #{order.order_number}</p><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p></div>
                <div className="text-right"><p className="text-sm font-bold">{formatGHC(Number(order.total_amount))}</p><p className="text-[10px] font-bold uppercase text-primary">{order.status}</p></div>
              </div>
            ))}
            {(data?.recentOrders.length ?? 0) === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No recent orders.</p>}
          </div>
        </section>

        <section className="dashboard-panel">
          <div><p className="text-xs font-bold text-primary">SELLER PIPELINE</p><h2 className="font-display text-xl font-bold">Newest shops</h2></div>
          <div className="mt-4 space-y-3">
            {(data?.recentSellers ?? []).map((seller) => (
              <div key={seller.user_id} className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-card text-primary"><Store size={17} /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{seller.shop_name}</p><p className="text-[10px] font-bold uppercase text-muted-foreground">{seller.status}</p></div>
                {seller.status === "pending" && <Clock size={15} className="text-warning" />}
              </div>
            ))}
          </div>
          <Link to="/admin/sellers" className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-bold">Manage sellers <ArrowRight size={15} /></Link>
        </section>
      </div>
    </div>
  );
}
