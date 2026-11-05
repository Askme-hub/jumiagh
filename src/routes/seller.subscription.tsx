import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, Send, Sparkles, CalendarClock, Package, Percent, Receipt, RefreshCw, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getPlan, subscriptionState, usePlans, useSellerProductCount, useSellerSubscription, useSubscriptionPayments, type PlanId,
} from "@/lib/subscriptions";
import { initiateSubscriptionCheckout } from "@/lib/subscriptions.functions";
import { sendMarketingCampaign } from "@/lib/sms.functions";

export const Route = createFileRoute("/seller/subscription")({
  component: SubscriptionPage,
  head: () => ({ meta: [{ title: "Subscription – Seller Hub – Kivora" }, { name: "robots", content: "noindex" }] }),
});

const ghs = (n: number) => `GH₵ ${n.toLocaleString("en-GH", { maximumFractionDigits: 2 })}`;

function SubscriptionPage() {
  const { user } = useAuth();
  const { data: sub, isLoading } = useSellerSubscription(user);
  const { data: plans = [] } = usePlans();
  const { data: productCount = 0 } = useSellerProductCount(user);
  const { data: payments = [] } = useSubscriptionPayments(user);
  const checkout = useServerFn(initiateSubscriptionCheckout);
  const [busy, setBusy] = useState<PlanId | null>(null);

  const st = subscriptionState(sub);
  const activePlanId = st.planId;
  const current = getPlan(activePlanId, plans);
  const limit = current.productLimit;
  const usedPct = limit ? Math.min(100, Math.round((productCount / Math.max(limit, 1)) * 100)) : 0;
  const expiringSoon = activePlanId !== "free" && st.daysLeft != null && st.daysLeft <= 5;

  const subscribe = async (plan: PlanId) => {
    if (plan === "free") return;
    setBusy(plan);
    try {
      const { authorization_url } = await checkout({
        data: { plan: plan as "starter" | "premium", callbackOrigin: window.location.origin },
      });
      window.location.href = authorization_url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start checkout");
      setBusy(null);
    }
  };

  return (
    <div className="dashboard-canvas p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Plans & billing</p>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Grow faster with the right plan</h1>
        <p className="text-sm text-muted-foreground mt-1">Lower commission, more products and better visibility for your shop.</p>
      </header>

      {st.expired && sub && sub.plan !== "free" && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft text-danger-ink px-4 py-3 text-sm font-medium">
          Your {getPlan(sub.plan as PlanId, plans).name} plan expired on {st.expiresAt?.toLocaleDateString()}. You're on Free until you renew.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="dashboard-panel lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Sparkles size={16} />
                <span className="text-xs font-bold uppercase tracking-wide">Current plan</span>
              </div>
              <h2 className="font-display text-3xl font-bold mt-1">{current.name}</h2>
              <p className="text-sm text-muted-foreground">{current.tagline}</p>
            </div>
            {activePlanId !== "free" && (
              <button
                onClick={() => subscribe(activePlanId)}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy === activePlanId ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Renew 30 days
              </button>
            )}
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat icon={Percent} label="Commission" value={`${current.commission}%`} />
            <Stat icon={Package} label="Products" value={limit == null ? `${productCount} / ∞` : `${productCount} / ${limit}`} />
            <Stat
              icon={CalendarClock}
              label={activePlanId === "free" ? "Billing" : "Renews"}
              value={activePlanId === "free" ? "Free forever" : st.expiresAt ? st.expiresAt.toLocaleDateString() : "—"}
              warn={expiringSoon}
              sub={activePlanId !== "free" && st.daysLeft != null ? `${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"} left` : undefined}
            />
          </div>
          {limit != null && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Product slots used</span>
                <span>{usedPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${usedPct >= 90 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${usedPct}%` }} />
              </div>
              {productCount >= limit && (
                <p className="text-xs text-danger-ink mt-2">You've reached your product limit. Upgrade to add more items.</p>
              )}
            </div>
          )}
        </div>

        <div className="dashboard-panel rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-primary" />
            <h3 className="font-bold">Billing history</h3>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4">No payments yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border max-h-64 overflow-auto">
              {payments.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold capitalize">{p.plan} plan</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="font-bold">{ghs(Number(p.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const Icon = p.icon;
          const isCurrent = p.id === activePlanId;
          const isDowngrade = p.price < current.price;
          return (
            <div
              key={p.id}
              className={`relative rounded-2xl border bg-card p-5 flex flex-col ${
                isCurrent ? "border-primary ring-2 ring-primary/30" : p.highlight ? "border-primary/60 shadow-elevated" : "border-border"
              }`}
            >
              {p.highlight && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-[11px] font-bold px-3 py-1 rounded-full">
                  Your plan
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.tagline}</p>
                </div>
              </div>
              <div className="mt-4">
                <span className="font-display text-3xl font-bold">{p.price === 0 ? "Free" : ghs(p.price)}</span>
                {p.price > 0 && <span className="text-muted-foreground text-sm">/month</span>}
              </div>
              <ul className="mt-4 space-y-2 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-success shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent || busy !== null || p.id === "free" || isLoading}
                onClick={() => subscribe(p.id)}
                className={`mt-5 w-full py-3 rounded-xl font-bold text-sm transition disabled:opacity-60 ${
                  isCurrent ? "bg-muted text-muted-foreground" : p.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-foreground text-background hover:opacity-90"
                }`}
              >
                {busy === p.id ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Redirecting…</span>
                ) : isCurrent ? "Current plan" : p.id === "free" ? "Included by default" : isDowngrade ? `Switch to ${p.name}` : `Upgrade to ${p.name}`}
              </button>
            </div>
          );
        })}
      </section>

      <section className="dashboard-panel rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 font-bold">Compare plans</th>
              {plans.map((p) => (
                <th key={p.id} className={`p-4 text-center font-bold ${p.id === activePlanId ? "text-primary" : ""}`}>{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Monthly price" cells={plans.map((p) => (p.price === 0 ? "Free" : ghs(p.price)))} />
            <Row label="Commission per sale" cells={plans.map((p) => `${p.commission}%`)} />
            <Row label="Products" cells={plans.map((p) => (p.productLimit == null ? "Unlimited" : String(p.productLimit)))} />
            <Row label="Featured slots" cells={plans.map((p) => (p.featuredSlots ? String(p.featuredSlots) : false))} />
            <Row label="SMS marketing" cells={plans.map((p) => p.extras.some((e) => /sms marketing/i.test(e)))} />
            <Row label="Advanced analytics" cells={plans.map((p) => p.extras.some((e) => /analytics/i.test(e)))} />
          </tbody>
        </table>
      </section>

      {activePlanId === "premium" && <MarketingPanel />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, warn }: { icon: any; label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${warn ? "border-warning/40 bg-warning-soft" : "border-border bg-muted/40"}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon size={14} /> {label}</div>
      <p className={`font-display text-lg font-bold mt-1 ${warn ? "text-warning-ink" : ""}`}>{value}</p>
      {sub && <p className={`text-xs ${warn ? "text-warning-ink" : "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: (string | boolean)[] }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="p-4 text-muted-foreground">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="p-4 text-center font-semibold">
          {c === true ? <Check size={16} className="inline text-success" /> : c === false ? <X size={16} className="inline text-muted-foreground" /> : c}
        </td>
      ))}
    </tr>
  );
}

function MarketingPanel() {
  const send = useServerFn(sendMarketingCampaign);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (msg.trim().length < 5) return toast.error("Message is too short");
    setBusy(true);
    try {
      const r = await send({ data: { message: msg.trim() } });
      toast.success(r.sent > 0 ? `Sent to ${r.sent} customer(s)` : r.detail);
      if (r.sent > 0) setMsg("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send campaign");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Send size={18} className="text-primary" />
        <h2 className="font-bold text-lg">SMS Marketing</h2>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Send a promotional SMS to customers who have ordered from your shop.
      </p>
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={3}
        maxLength={320}
        placeholder="e.g. Flash sale this weekend! 20% off all items at our Kivora shop."
        className="mt-3 w-full border-2 border-border focus:border-primary rounded-xl px-4 py-3 outline-none bg-background transition"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">{msg.length}/320</span>
        <button
          disabled={busy}
          onClick={submit}
          className="bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send campaign"}
        </button>
      </div>
    </div>
  );
}
