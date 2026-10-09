import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SalesPoint = { date: string; label: string; revenue: number; orders: number };
export type TopProduct = { name: string; qty: number; revenue: number };

export type SellerAnalytics = {
  daily: SalesPoint[];
  topProducts: TopProduct[];
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  deliveredOrders: number;
};

// Seller sales analytics for the last 30 days, derived from their order items.
export const getSellerAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SellerAnalytics> => {
    const { userId } = context;

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "seller")
      .maybeSingle();
    if (!roleRow) {
      return { daily: [], topProducts: [], totalRevenue: 0, totalOrders: 0, totalUnits: 0, deliveredOrders: 0 };
    }

    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("order_id, name, qty, price, fulfillment_status")
      .eq("seller_id", userId);
    if (!items || items.length === 0) {
      return { daily: [], topProducts: [], totalRevenue: 0, totalOrders: 0, totalUnits: 0, deliveredOrders: 0 };
    }

    const orderIds = [...new Set(items.map((i) => i.order_id))];
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, status, payment_status")
      .in("id", orderIds)
      .gte("created_at", since.toISOString());
    const orderMap = new Map((orders ?? []).map((o) => [o.id, o]));

    // count only real orders (paid or COD placed), not cancelled/failed
    const valid = items.filter((i) => {
      const o = orderMap.get(i.order_id);
      if (!o) return false;
      if (o.status === "cancelled") return false;
      return o.payment_status === "paid" || o.payment_status === "cod" || o.status !== "pending_payment";
    });

    const days: SalesPoint[] = [];
    for (let d = 0; d < 30; d++) {
      const day = new Date(since);
      day.setDate(since.getDate() + d);
      const key = day.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: day.toLocaleDateString("en-GH", { day: "numeric", month: "short" }),
        revenue: 0,
        orders: 0,
      });
    }
    const dayMap = new Map(days.map((d) => [d.date, d]));
    const countedOrders = new Map<string, Set<string>>();

    for (const item of valid) {
      const o = orderMap.get(item.order_id)!;
      const key = o.created_at.slice(0, 10);
      const point = dayMap.get(key);
      if (!point) continue;
      point.revenue += Number(item.price) * item.qty;
      let set = countedOrders.get(key);
      if (!set) {
        set = new Set();
        countedOrders.set(key, set);
      }
      if (!set.has(item.order_id)) {
        set.add(item.order_id);
        point.orders += 1;
      }
    }

    const productMap = new Map<string, TopProduct>();
    for (const item of valid) {
      const entry = productMap.get(item.name) ?? { name: item.name, qty: 0, revenue: 0 };
      entry.qty += item.qty;
      entry.revenue += Number(item.price) * item.qty;
      productMap.set(item.name, entry);
    }
    const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const uniqueOrders = new Set(valid.map((i) => i.order_id));
    const deliveredOrders = new Set(
      valid.filter((i) => i.fulfillment_status === "delivered").map((i) => i.order_id),
    );

    return {
      daily: days.map((d) => ({ ...d, revenue: Math.round(d.revenue * 100) / 100 })),
      topProducts,
      totalRevenue: Math.round(valid.reduce((a, i) => a + Number(i.price) * i.qty, 0) * 100) / 100,
      totalOrders: uniqueOrders.size,
      totalUnits: valid.reduce((a, i) => a + i.qty, 0),
      deliveredOrders: deliveredOrders.size,
    };
  });
