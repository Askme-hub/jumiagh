import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FinancePoint = { label: string; revenue: number; commission: number };
export type AdminFinance = {
  grossRevenue: number;
  paidOrders: number;
  codOrders: number;
  commissionEarned: number;
  sellerBalances: number;
  sellerPending: number;
  totalWithdrawn: number;
  payouts: { pending: number; pendingAmount: number; approved: number; paid: number; paidAmount: number; rejected: number };
  daily: FinancePoint[];
  topSellers: { name: string; earned: number; commission: number }[];
};

export const getAdminFinance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminFinance> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const [ordersRes, walletsRes, wdRes, txRes, shopsRes] = await Promise.all([
      db.from("orders").select("total, status, payment_status, created_at"),
      db.from("seller_wallets").select("user_id, balance, pending, total_earned, total_withdrawn, commission_paid"),
      db.from("withdrawal_requests").select("amount, status"),
      db.from("transactions").select("type, amount, created_at").gte("created_at", since.toISOString()),
      db.from("seller_profiles").select("user_id, shop_name"),
    ]);

    const orders = (ordersRes.data ?? []).filter((o) => o.status !== "cancelled" && o.payment_status !== "failed");
    const counted = orders.filter((o) => o.payment_status === "paid" || o.payment_status === "cod" || o.status === "delivered");
    const wallets = walletsRes.data ?? [];
    const wds = wdRes.data ?? [];
    const sum = (a: number[]) => a.reduce((s, n) => s + Number(n || 0), 0);

    const days: FinancePoint[] = [];
    const idx = new Map<string, FinancePoint>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const p = { label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), revenue: 0, commission: 0 };
      days.push(p);
      idx.set(key, p);
    }
    for (const o of counted) {
      const p = idx.get(o.created_at.slice(0, 10));
      if (p) p.revenue += Number(o.total);
    }
    for (const t of txRes.data ?? []) {
      if (t.type !== "commission") continue;
      const p = idx.get(t.created_at.slice(0, 10));
      if (p) p.commission += Math.abs(Number(t.amount));
    }

    const names = new Map((shopsRes.data ?? []).map((s) => [s.user_id, s.shop_name]));
    const topSellers = [...wallets]
      .sort((a, b) => Number(b.total_earned) - Number(a.total_earned))
      .slice(0, 5)
      .map((w) => ({ name: names.get(w.user_id) ?? "Seller", earned: Number(w.total_earned), commission: Number(w.commission_paid) }));

    const by = (s: string) => wds.filter((w) => w.status === s);
    return {
      grossRevenue: sum(counted.map((o) => Number(o.total))),
      paidOrders: counted.filter((o) => o.payment_status === "paid").length,
      codOrders: counted.filter((o) => o.payment_status === "cod").length,
      commissionEarned: sum(wallets.map((w) => Number(w.commission_paid))),
      sellerBalances: sum(wallets.map((w) => Number(w.balance))),
      sellerPending: sum(wallets.map((w) => Number(w.pending))),
      totalWithdrawn: sum(wallets.map((w) => Number(w.total_withdrawn))),
      payouts: {
        pending: by("pending").length,
        pendingAmount: sum(by("pending").map((w) => Number(w.amount))),
        approved: by("approved").length,
        paid: by("paid").length,
        paidAmount: sum(by("paid").map((w) => Number(w.amount))),
        rejected: by("rejected").length,
      },
      daily: days,
      topSellers,
    };
  });
