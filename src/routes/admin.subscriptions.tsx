import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown, Save, Users, Wallet, CalendarPlus, Ban, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionState, usePlans, type Plan, type PlanId } from "@/lib/subscriptions";

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubscriptions,
  head: () => ({ meta: [{ title: "Subscriptions – Admin – Kivora" }, { name: "robots", content: "noindex" }] }),
});

const ghs = (n: number) => `GH₵ ${n.toLocaleString("en-GH", { maximumFractionDigits: 2 })}`;
const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function AdminSubscriptions() {
  const qc = useQueryClient();
  const { data: plans = [] } = usePlans();
  const { data, refetch } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const [subs, pays, shops] = await Promise.all([
        supabase.from("seller_subscriptions").select("*").order("updated_at", { ascending: false }),
        supabase.from("subscription_payments").select("amount, created_at"),
        supabase.from("seller_profiles").select("user_id, shop_name"),
      ]);
      const names = new Map((shops.data ?? []).map((s) => [s.user_id, s.shop_name]));
      const payments = pays.data ?? [];
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      return {
        subs: (subs.data ?? []).map((s) => ({ ...s, shop: names.get(s.user_id) ?? "Unknown shop" })),
        revenue: payments.reduce((a, p) => a + Number(p.amount), 0),
        monthRevenue: payments.filter((p) => new Date(p.created_at) >= monthStart).reduce((a, p) => a + Number(p.amount), 0),
      };
    },
  });
  const subs = data?.subs ?? [];
  const active = subs.filter((s) => !subscriptionState(s).expired && s.plan !== "free");

  const update = async (userId: string, patch: { plan?: PlanId; status?: string; expires_at?: string | null }, msg: string) => {
    const { error } = await supabase.from("seller_subscriptions").update(patch).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success(msg);
    refetch();
  };
  const extend = (s: (typeof subs)[number]) => {
    const base = s.expires_at && new Date(s.expires_at) > new Date() ? new Date(s.expires_at) : new Date();
    update(s.user_id, { status: "active", expires_at: new Date(base.getTime() + 30 * 86400000).toISOString() }, "Extended by 30 days");
  };

  return (
    <div className="dashboard-canvas p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Monetisation</p>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Seller subscriptions</h1>
        <p className="text-sm text-muted-foreground">Set plan prices, commission and limits, and manage subscribers.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi icon={Users} label="Active paid sellers" value={String(active.length)} />
        <Kpi icon={Wallet} label="Revenue this month" value={ghs(data?.monthRevenue ?? 0)} />
        <Kpi icon={Crown} label="All-time plan revenue" value={ghs(data?.revenue ?? 0)} />
      </div>

      <section>
        <h2 className="font-display text-lg font-bold mb-3">Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => <PlanEditor key={p.id} plan={p} onSaved={() => qc.invalidateQueries({ queryKey: ["subscription-plans"] })} />)}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Commission changes apply to orders delivered after saving. Price changes apply to the next payment.</p>
      </section>

      <GiftPlan plans={plans} onDone={() => refetch()} />

      <section className="dashboard-panel rounded-2xl border border-border bg-card">
        <h2 className="font-display text-lg font-bold p-4 border-b border-border">Subscribers</h2>
        {subs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No sellers have subscribed yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {subs.map((s) => {
              const st = subscriptionState(s);
              const label = s.status !== "active" ? "Cancelled" : st.expired ? "Expired" : "Active";
              const tone = label === "Active" ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink";
              return (
                <li key={s.id} className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-semibold">{s.shop}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.expires_at ? `Ends ${new Date(s.expires_at).toLocaleDateString()}` : "No end date"}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${tone}`}>{label}</span>
                  <select
                    value={s.plan}
                    onChange={(e) => update(s.user_id, { plan: e.target.value as PlanId }, "Plan changed")}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={() => extend(s)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:bg-muted">
                    <CalendarPlus size={14} /> +30 days
                  </button>
                  {s.status === "active" && (
                    <button
                      onClick={() => confirm(`Cancel ${s.shop}'s plan now?`) && update(s.user_id, { status: "cancelled" }, "Plan cancelled")}
                      className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 text-destructive px-2.5 py-1.5 text-xs font-bold hover:bg-danger-soft"
                    >
                      <Ban size={14} /> Cancel
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

const DURATIONS = [
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
  { days: 0, label: "No end date" },
];

function GiftPlan({ plans, onDone }: { plans: Plan[]; onDone: () => void }) {
  const { data: shops = [] } = useQuery({
    queryKey: ["admin-gift-shops"],
    queryFn: async () => {
      const { data } = await supabase.from("seller_profiles").select("user_id, shop_name").eq("status", "approved").order("shop_name");
      return data ?? [];
    },
  });
  const paid = plans.filter((p) => p.id !== "free");
  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState<PlanId>("premium");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);

  const gift = async () => {
    if (!userId) return toast.error("Choose a shop");
    const shop = shops.find((s) => s.user_id === userId)?.shop_name ?? "Shop";
    const planName = plans.find((p) => p.id === plan)?.name ?? plan;
    if (!confirm(`Give ${shop} the ${planName} plan for free?`)) return;
    setBusy(true);
    const now = new Date();
    const { error } = await supabase.from("seller_subscriptions").upsert(
      {
        user_id: userId, plan, status: "active", started_at: now.toISOString(),
        expires_at: days ? new Date(now.getTime() + days * 86400000).toISOString() : null,
        payment_reference: "ADMIN-GIFT",
      },
      { onConflict: "user_id" },
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${shop} upgraded to ${planName} for free`);
    onDone();
  };

  return (
    <section className="dashboard-panel rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold flex items-center gap-2"><Gift size={18} className="text-primary" /> Upgrade a seller for free</h2>
        <p className="text-xs text-muted-foreground">No payment needed. The seller gets the plan's commission, product limit and benefits straight away.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <select className={input} value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Choose shop…</option>
          {shops.map((s) => <option key={s.user_id} value={s.user_id}>{s.shop_name}</option>)}
        </select>
        <select className={input} value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>
          {paid.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={input} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {DURATIONS.map((d) => <option key={d.days} value={d.days}>{d.label}</option>)}
        </select>
        <button onClick={gift} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
          <Gift size={16} /> {busy ? "Upgrading…" : "Upgrade free"}
        </button>
      </div>
    </section>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="dashboard-stat rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon size={14} className="text-primary" /> {label}</div>
      <p className="font-display text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function PlanEditor({ plan, onSaved }: { plan: Plan; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", tagline: "", price: "", commission: "", limit: "", slots: "", extras: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setF({
      name: plan.name, tagline: plan.tagline, price: String(plan.price), commission: String(plan.commission),
      limit: plan.productLimit == null ? "" : String(plan.productLimit), slots: String(plan.featuredSlots), extras: plan.extras.join("\n"),
    });
  }, [plan]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    const price = Number(f.price), commission = Number(f.commission), slots = Number(f.slots || 0);
    const limit = f.limit.trim() === "" ? null : Number(f.limit);
    if (!f.name.trim()) return toast.error("Name is required");
    if (!(price >= 0) || !(commission >= 0 && commission <= 100) || (limit != null && !(limit >= 0)) || !(slots >= 0))
      return toast.error("Check the numbers: commission must be 0–100, others 0 or more");
    if (plan.id !== "free" && price <= 0) return toast.error("Paid plans need a price above 0");
    setSaving(true);
    const { error } = await supabase.from("subscription_plans").update({
      name: f.name.trim(), tagline: f.tagline.trim(), price: plan.id === "free" ? 0 : price, commission,
      product_limit: limit, featured_slots: slots,
      features: f.extras.split("\n").map((x) => x.trim()).filter(Boolean), updated_at: new Date().toISOString(),
    }).eq("id", plan.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${f.name} plan saved`);
    onSaved();
  };

  return (
    <div className="dashboard-panel rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <plan.icon size={18} className="text-primary" />
        <span className="text-xs font-bold uppercase text-muted-foreground">{plan.id}</span>
      </div>
      <Field label="Name"><input className={input} value={f.name} onChange={set("name")} /></Field>
      <Field label="Tagline"><input className={input} value={f.tagline} onChange={set("tagline")} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Price (GH₵/mo)"><input className={input} type="number" min={0} value={f.price} onChange={set("price")} disabled={plan.id === "free"} /></Field>
        <Field label="Commission %"><input className={input} type="number" min={0} max={100} step="0.5" value={f.commission} onChange={set("commission")} /></Field>
        <Field label="Product limit"><input className={input} type="number" min={0} placeholder="Unlimited" value={f.limit} onChange={set("limit")} /></Field>
        <Field label="Featured slots"><input className={input} type="number" min={0} value={f.slots} onChange={set("slots")} /></Field>
      </div>
      <Field label="Extra benefits (one per line)"><textarea className={input} rows={3} value={f.extras} onChange={set("extras")} /></Field>
      <button onClick={save} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
        <Save size={16} /> {saving ? "Saving…" : "Save plan"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
