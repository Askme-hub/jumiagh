import { PushToggle } from "@/components/PushToggle";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Package, Clock, CheckCircle2, Store, MessageCircle, ShoppingBag, Wallet, Plus, AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsSeller, useSellerProfile } from "@/hooks/use-seller";
import { SellerVerification } from "@/components/SellerVerification";
import { formatGHC } from "@/lib/store";
import { getSellerOrders } from "@/lib/seller-orders.functions";
import { getSellerAnalytics } from "@/lib/analytics.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/seller/")({
  component: SellerDashboard,
  head: () => ({ meta: [
    { title: "Seller Overview — Kivora Ghana" },
    { name: "description", content: "Track your Kivora shop performance, orders, inventory and wallet." },
    { property: "og:title", content: "Seller Overview — Kivora Ghana" },
    { property: "og:description", content: "Your Kivora seller business overview." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function SellerDashboard() {
  const { user } = useAuth();
  const { data: isSeller, isLoading: roleLoading } = useIsSeller(user);
  const { data: profile, isLoading: profileLoading, refetch } = useSellerProfile(user);

  if (!user) return <div className="p-6 text-sm">Please log in.</div>;
  if (roleLoading || profileLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!isSeller && !profile) return <ApplyForm onApplied={() => refetch()} userId={user.id} />;

  if (!isSeller && profile?.status === "pending") {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <Clock size={48} className="mx-auto text-warning-ink" />
        <h2 className="mt-4 text-xl font-bold">Application Pending</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Your seller application for <strong>{profile.shop_name}</strong> is under review.
          You'll be able to upload products once an admin approves you.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild><Link to="/"><ShoppingBag /> Continue shopping</Link></Button>
          <Button asChild variant="outline"><Link to="/categories">Browse categories</Link></Button>
        </div>
      </div>
    );
  }

  if (!isSeller && profile?.status === "suspended") {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-destructive">Account Suspended</h2>
        <p className="text-muted-foreground mt-2 text-sm">Contact support to restore your seller access.</p>
      </div>
    );
  }

  return (
    <div>
      {profile && (
        <div className="p-4 pb-0">
          <SellerVerification
            userId={user.id}
            status={profile.status}
            verificationStatus={(profile as any).verification_status ?? "not_verified"}
            onChanged={() => refetch()}
          />
        </div>
      )}
      <Overview userId={user.id} shopName={profile?.shop_name ?? "Your shop"} />
    </div>
  );
}

function Overview({ userId, shopName }: { userId: string; shopName: string }) {
  const fetchOrders = useServerFn(getSellerOrders);
  const { data: products } = useQuery({
    queryKey: ["seller-products-summary", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, approval_status, stock")
        .eq("seller_id", userId);
      return data ?? [];
    },
  });
  const { data: wallet } = useQuery({
    queryKey: ["seller-dashboard-wallet", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_wallets")
        .select("balance, pending, total_earned")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["seller-dashboard-orders", userId],
    queryFn: () => fetchOrders(),
  });
  const fetchAnalytics = useServerFn(getSellerAnalytics);
  const { data: analytics } = useQuery({
    queryKey: ["seller-analytics", userId],
    queryFn: () => fetchAnalytics(),
  });

  const approved = products?.filter((p) => p.approval_status === "approved").length ?? 0;
  const pendingProducts = products?.filter((p) => p.approval_status === "pending").length ?? 0;
  const lowStock = products?.filter((p) => p.approval_status === "approved" && (p.stock ?? 0) <= 3) ?? [];
  const openOrders = orders.filter((o) =>
    ["placed", "pending", "processing", "confirmed"].includes(String(o.status).toLowerCase())
    || o.items?.some((i: any) => ["pending", "processing"].includes(String(i.fulfillment_status).toLowerCase()))
  );
  const recentOrders = orders.slice(0, 5);

  const actions = [
    { to: "/seller/orders" as const, label: "Orders", hint: openOrders.length ? `${openOrders.length} open` : "Manage", icon: ShoppingBag, tone: "primary" },
    { to: "/seller/products/new" as const, label: "Add product", hint: "List new item", icon: Plus, tone: "default" },
    { to: "/seller/wallet" as const, label: "Wallet", hint: formatGHC(Number(wallet?.balance ?? 0)), icon: Wallet, tone: "default" },
    { to: "/seller/messages" as const, label: "Messages", hint: "Chat buyers", icon: MessageCircle, tone: "default" },
  ];

  return (
    <div className="dashboard-canvas space-y-5 p-4 pb-8 md:p-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Seller hub</p>
          <h1 className="mt-0.5 truncate font-display text-2xl font-bold tracking-tight md:text-3xl">
            {shopName}
          </h1>
        </div>
        <PushToggle compact />
      </div>

      {/* Primary actions — large touch targets */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.to}
              to={a.to}
              className={
                a.tone === "primary"
                  ? "flex flex-col items-start gap-3 rounded-2xl bg-primary p-4 text-primary-foreground shadow-sm transition active:scale-[0.98] hover:opacity-95"
                  : "flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition active:scale-[0.98] hover:bg-muted/40"
              }
            >
              <span
                className={
                  a.tone === "primary"
                    ? "grid h-10 w-10 place-items-center rounded-xl bg-primary-foreground/15"
                    : "grid h-10 w-10 place-items-center rounded-xl bg-muted"
                }
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold leading-tight">{a.label}</p>
                <p className={`mt-0.5 text-xs ${a.tone === "primary" ? "opacity-80" : "text-muted-foreground"}`}>
                  {a.hint}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Wallet strip */}
      <Link
        to="/seller/wallet"
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm transition hover:bg-muted/30 active:scale-[0.99]"
      >
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Available balance</p>
          <p className="mt-0.5 font-display text-xl font-bold tracking-tight">
            {formatGHC(Number(wallet?.balance ?? 0))}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatGHC(Number(wallet?.pending ?? 0))} pending
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
          Withdraw <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      {/* Needs attention — only when relevant */}
      {(openOrders.length > 0 || lowStock.length > 0 || pendingProducts > 0) && (
        <section className="space-y-2">
          <p className="px-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Needs attention
          </p>
          <div className="space-y-2">
            {openOrders.length > 0 && (
              <Link
                to="/seller/orders"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition hover:bg-muted/30 active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {openOrders.length} order{openOrders.length === 1 ? "" : "s"} to process
                  </p>
                  <p className="truncate text-xs text-muted-foreground">Pack, ship, or mark delivered</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            )}
            {lowStock.length > 0 && (
              <Link
                to="/seller/products"
                className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-3.5 transition hover:bg-warning/10 active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning-ink">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {lowStock.length} low-stock item{lowStock.length === 1 ? "" : "s"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {lowStock.map((p) => p.name).slice(0, 3).join(", ")}
                    {lowStock.length > 3 ? "…" : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            )}
            {pendingProducts > 0 && (
              <Link
                to="/seller/products"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition hover:bg-muted/30 active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Clock className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {pendingProducts} product{pendingProducts === 1 ? "" : "s"} awaiting approval
                  </p>
                  <p className="truncate text-xs text-muted-foreground">Admin review in progress</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Snapshot numbers */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-border bg-card p-3 text-center sm:p-4">
          <p className="font-display text-lg font-bold sm:text-xl">{approved}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Live products</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center sm:p-4">
          <p className="font-display text-lg font-bold sm:text-xl">{analytics?.totalOrders ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Orders (30d)</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center sm:p-4">
          <p className="truncate font-display text-lg font-bold sm:text-xl">
            {formatGHC(analytics?.totalRevenue ?? 0)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Sales (30d)</p>
        </div>
      </div>

      {/* Recent orders */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold">Recent orders</h2>
          <Link to="/seller/orders" className="text-xs font-semibold text-primary">
            See all
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentOrders.map((order) => (
            <Link
              key={order.id}
              to="/seller/orders/$id"
              params={{ id: order.id }}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/40 active:bg-muted/60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {order.items?.map((item: any) => item.name).join(", ") || "Order"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  #{order.order_number} · {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold">{formatGHC(order.subtotal)}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {order.status}
                </p>
              </div>
            </Link>
          ))}
          {recentOrders.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No orders yet. Share your shop to get your first sale.
            </p>
          )}
        </div>
      </section>

      {/* Secondary shortcuts */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { to: "/seller/products" as const, label: "Products", icon: Package },
          { to: "/seller/pos" as const, label: "POS", icon: Store },
          { to: "/seller/reviews" as const, label: "Reviews", icon: CheckCircle2 },
          { to: "/seller/profile" as const, label: "Shop profile", icon: Store },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold transition hover:bg-muted/40 active:scale-[0.98]"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const STEPS = ["Country", "Account", "Personal", "Review"];

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div
            className={`w-3.5 h-3.5 rounded-full transition ${
              i <= step ? "bg-primary" : "bg-muted border border-border"
            }`}
          />
          {i < STEPS.length - 1 && (
            <div
              className={`h-1 flex-1 rounded-full transition ${
                i < step ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ApplyForm({ userId, onApplied }: { userId: string; onApplied: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState("Ghana");
  const [shop, setShop] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const apply = async () => {
    if (!shop.trim()) {
      setStep(1);
      return toast.error("Shop name is required");
    }
    setBusy(true);
    const { error } = await supabase.from("seller_profiles").insert({
      user_id: userId,
      shop_name: shop.trim(),
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      status: "pending",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted! Admin will review shortly.");
    onApplied();
  };

  const titles = [
    { h: "Sell on Kivora", s: "Choose the country of your shop" },
    { h: "Setup your account", s: "Provide your shop name and email" },
    { h: "Personal Information", s: "Add your contact details" },
    { h: "Review & submit", s: "Confirm your details to finish" },
  ];

  const field =
    "w-full border-2 border-border focus:border-primary rounded-xl px-4 py-3 outline-none bg-card transition";

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <Stepper step={step} />
        <h2 className="text-2xl font-extrabold text-foreground">{titles[step].h}</h2>
        <p className="text-muted-foreground text-sm mt-1">{titles[step].s}</p>

        <div className="mt-5 space-y-3">
          {step === 0 && (
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                Select your country *
              </span>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={`${field} mt-1`}
              >
                <option>Ghana</option>
                <option>Nigeria</option>
                <option>Kenya</option>
                <option>Côte d'Ivoire</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Only for sellers registered &amp; selling in their own country.
              </p>
            </label>
          )}

          {step === 1 && (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">
                  Email Address *
                </span>
                <input
                  value={user?.email ?? ""}
                  readOnly
                  className={`${field} mt-1 bg-muted text-muted-foreground`}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">
                  Shop name *
                </span>
                <input
                  placeholder="e.g. Kofi Electronics"
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  className={`${field} mt-1`}
                />
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">
                  Phone number
                </span>
                <div className="mt-1 flex gap-2">
                  <span className="flex items-center px-4 rounded-xl border-2 border-border bg-muted font-semibold text-sm">
                    +233
                  </span>
                  <input
                    placeholder="24 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={field}
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">
                  About your shop
                </span>
                <textarea
                  placeholder="Tell buyers about your shop"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className={`${field} mt-1`}
                />
              </label>
            </>
          )}

          {step === 3 && (
            <div className="space-y-2 text-sm">
              <Row label="Country" value={country} />
              <Row label="Email" value={user?.email ?? "—"} />
              <Row label="Shop name" value={shop || "—"} />
              <Row label="Phone" value={phone ? `+233 ${phone}` : "—"} />
              <p className="text-xs text-muted-foreground pt-2">
                Once submitted, an admin will review and approve your shop.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={back}
              className="flex-1 border-2 border-border rounded-xl py-3 font-bold text-foreground hover:bg-muted transition"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              disabled={step === 1 && !shop.trim()}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-bold disabled:opacity-50 transition"
            >
              Next
            </button>
          ) : (
            <button
              onClick={apply}
              disabled={busy}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-bold disabled:opacity-60 transition"
            >
              {busy ? "Submitting…" : "Submit application"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}
