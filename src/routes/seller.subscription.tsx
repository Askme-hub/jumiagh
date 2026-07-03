import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, Send, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PLANS, getPlan, useSellerSubscription, type PlanId } from "@/lib/subscriptions";
import { initiateSubscriptionCheckout } from "@/lib/subscriptions.functions";
import { sendMarketingCampaign } from "@/lib/sms.functions";

export const Route = createFileRoute("/seller/subscription")({
  component: SubscriptionPage,
  head: () => ({ meta: [{ title: "Subscription – Seller Hub – Kivora" }] }),
});

function SubscriptionPage() {
  const { user } = useAuth();
  const { data: sub, isLoading } = useSellerSubscription(user);
  const checkout = useServerFn(initiateSubscriptionCheckout);
  const [busy, setBusy] = useState<PlanId | null>(null);

  const activePlanId: PlanId =
    sub?.status === "active" && (!sub.expires_at || new Date(sub.expires_at) > new Date())
      ? (sub.plan as PlanId)
      : "free";
  const current = getPlan(activePlanId);

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
    <div className="p-4 space-y-5 max-w-5xl mx-auto">
      <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-5">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles size={18} />
          <span className="text-xs font-bold uppercase tracking-wide">Your plan</span>
        </div>
        <h1 className="text-2xl font-extrabold mt-1 capitalize">{current.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {current.commission}% commission
          {current.productLimit ? ` · up to ${current.productLimit} products` : " · unlimited products"}
          {sub?.expires_at && activePlanId !== "free"
            ? ` · renews ${new Date(sub.expires_at).toLocaleDateString()}`
            : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const Icon = p.icon;
          const isCurrent = p.id === activePlanId;
          return (
            <div
              key={p.id}
              className={`relative rounded-2xl border bg-card p-5 flex flex-col ${
                p.highlight ? "border-primary shadow-elevated" : "border-border"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.tagline}</p>
                </div>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-extrabold">GH₵ {p.price}</span>
                <span className="text-muted-foreground text-sm">/mo</span>
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
                  isCurrent
                    ? "bg-muted text-muted-foreground"
                    : p.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-foreground text-background hover:opacity-90"
                }`}
              >
                {busy === p.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Redirecting…
                  </span>
                ) : isCurrent ? (
                  "Current plan"
                ) : p.id === "free" ? (
                  "Default plan"
                ) : (
                  `Upgrade to ${p.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {activePlanId === "premium" && <MarketingPanel />}
    </div>
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
