import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHC } from "@/lib/store";

type Sale = {
  id: string;
  receipt_number: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: { product_id: string; name: string; price: number; qty: number }[];
  created_at: string;
};

const PAY: Record<string, string> = { cash: "Cash", momo: "MoMo", card: "Card" };

export function PosSales() {
  const { user } = useAuth();
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("today");
  const [pay, setPay] = useState<"all" | "cash" | "momo" | "card">("all");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["pos-sales-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_sales")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Sale[];
    },
  });

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return sales.filter((s) => {
      const d = new Date(s.created_at);
      if (range === "today" && d < startOfToday) return false;
      if (range === "7d" && d < new Date(now.getTime() - 7 * 864e5)) return false;
      if (range === "30d" && d < new Date(now.getTime() - 30 * 864e5)) return false;
      if (pay !== "all" && s.payment_method !== pay) return false;
      return true;
    });
  }, [sales, range, pay]);

  const summary = useMemo(() => {
    const total = filtered.reduce((a, s) => a + Number(s.total), 0);
    const count = filtered.length;
    const units = filtered.reduce(
      (a, s) => a + (s.items ?? []).reduce((b, i) => b + Number(i.qty), 0),
      0
    );
    const byPay = { cash: 0, momo: 0, card: 0 };
    filtered.forEach((s) => {
      const k = s.payment_method as keyof typeof byPay;
      if (k in byPay) byPay[k] += Number(s.total);
    });
    // top products
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    filtered.forEach((s) => {
      (s.items ?? []).forEach((i) => {
        const cur = map.get(i.product_id) ?? { name: i.name, qty: 0, revenue: 0 };
        cur.qty += Number(i.qty);
        cur.revenue += Number(i.price) * Number(i.qty);
        map.set(i.product_id, cur);
      });
    });
    const top = [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
    return { total, count, units, byPay, top };
  }, [filtered]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["today", "Today"],
            ["7d", "7 days"],
            ["30d", "30 days"],
            ["all", "All"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setRange(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              range === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 w-px self-stretch bg-border" />
        {(
          [
            ["all", "All pay"],
            ["cash", "Cash"],
            ["momo", "MoMo"],
            ["card", "Card"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setPay(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              pay === k ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card label="Revenue" value={formatGHC(summary.total)} />
        <Card label="Sales" value={String(summary.count)} />
        <Card label="Units sold" value={String(summary.units)} />
        <Card
          label="Avg ticket"
          value={summary.count ? formatGHC(summary.total / summary.count) : formatGHC(0)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold">Payment mix</h2>
          <div className="space-y-2 text-sm">
            {(["cash", "momo", "card"] as const).map((k) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{PAY[k]}</span>
                <span className="font-semibold">{formatGHC(summary.byPay[k])}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold">Top products</h2>
          {summary.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales in this range.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {summary.top.map((t) => (
                <li key={t.name} className="flex justify-between gap-2">
                  <span className="truncate">
                    {t.name}{" "}
                    <span className="text-muted-foreground">×{t.qty}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{formatGHC(t.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold">Sales list</h2>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No sales in this range.</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{s.receipt_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()} · {PAY[s.payment_method] ?? s.payment_method}
                    {s.customer_name ? ` · ${s.customer_name}` : ""}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {(s.items ?? []).map((i) => `${i.name}×${i.qty}`).join(", ")}
                  </p>
                </div>
                <p className="shrink-0 font-bold">{formatGHC(Number(s.total))}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold">{value}</p>
    </div>
  );
}
