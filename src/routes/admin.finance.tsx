import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAdminFinance } from "@/lib/admin-finance.functions";

export const Route = createFileRoute("/admin/finance")({
  component: AdminFinancePage,
  head: () => ({ meta: [
    { title: "Finance — Kivora Admin" },
    { name: "description", content: "Marketplace revenue, commission and payout overview." },
    { property: "og:title", content: "Finance — Kivora Admin" },
    { property: "og:description", content: "Marketplace revenue, commission and payout overview." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});

const cedi = (n: number) => `GH₵ ${n.toLocaleString("en-GH", { maximumFractionDigits: 2 })}`;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="dashboard-stat rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function AdminFinancePage() {
  const fetchFinance = useServerFn(getAdminFinance);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-finance"], queryFn: () => fetchFinance() });

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading finance…</p>;
  if (error || !data) return <p className="p-6 text-sm text-destructive">Couldn't load finance data.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Finance</h1>
        <p className="text-sm text-muted-foreground">Marketplace revenue, commission and seller payouts.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Gross sales" value={cedi(data.grossRevenue)} hint={`${data.paidOrders} paid · ${data.codOrders} pay on delivery`} />
        <Stat label="Commission earned" value={cedi(data.commissionEarned)} hint="Kivora's share" />
        <Stat label="Seller balances" value={cedi(data.sellerBalances)} hint={`${cedi(data.sellerPending)} pending`} />
        <Stat label="Paid out to sellers" value={cedi(data.totalWithdrawn)} />
      </div>

      <section className="dashboard-panel rounded-2xl border bg-card p-4">
        <h2 className="mb-3 font-display font-semibold">Last 30 days</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" fontSize={11} tickLine={false} interval="preserveStartEnd" />
              <YAxis fontSize={11} tickLine={false} width={50} />
              <Tooltip formatter={(v: number) => cedi(v)} />
              <Area type="monotone" dataKey="revenue" name="Sales" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} />
              <Area type="monotone" dataKey="commission" name="Commission" stroke="var(--foreground)" fill="var(--foreground)" fillOpacity={0.08} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="dashboard-panel rounded-2xl border bg-card p-4">
          <h2 className="mb-3 font-display font-semibold">Payout requests</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Waiting for review</span><span className="font-semibold">{data.payouts.pending} · {cedi(data.payouts.pendingAmount)}</span></li>
            <li className="flex justify-between"><span>Approved</span><span className="font-semibold">{data.payouts.approved}</span></li>
            <li className="flex justify-between"><span>Paid</span><span className="font-semibold">{data.payouts.paid} · {cedi(data.payouts.paidAmount)}</span></li>
            <li className="flex justify-between"><span>Rejected</span><span className="font-semibold">{data.payouts.rejected}</span></li>
          </ul>
        </section>
        <section className="dashboard-panel rounded-2xl border bg-card p-4">
          <h2 className="mb-3 font-display font-semibold">Top earning shops</h2>
          {data.topSellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No seller earnings yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.topSellers.map((s) => (
                <li key={s.name} className="flex justify-between gap-2">
                  <span className="truncate">{s.name}</span>
                  <span className="shrink-0 font-semibold">{cedi(s.earned)} <span className="text-xs font-normal text-muted-foreground">({cedi(s.commission)} fee)</span></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
