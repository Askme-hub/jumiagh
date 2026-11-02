import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Package, Clock, CheckCircle2, Store, ArrowRight, MessageCircle, ShoppingBag, Wallet, Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
        <Clock size={48} className="mx-auto text-amber-500" />
        <h2 className="mt-4 text-xl font-bold">Application Pending</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Your seller application for <strong>{profile.shop_name}</strong> is under review.
          You'll be able to upload products once an admin approves you.
        </p>
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
      const { data } = await supabase.from("seller_wallets").select("balance, pending, total_earned").eq("user_id", userId).maybeSingle();
      return data;
    },
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["seller-dashboard-orders", userId],
    queryFn: () => fetchOrders(),
  });

  const approved = products?.filter((p) => p.approval_status === "approved").length ?? 0;
  const pending = products?.filter((p) => p.approval_status === "pending").length ?? 0;
  const rejected = products?.filter((p) => p.approval_status === "rejected").length ?? 0;
  const totalValue = products?.reduce((s, p) => s + Number(p.price) * (p.stock ?? 0), 0) ?? 0;

  return (
    <div className="dashboard-canvas p-4 md:p-6">
      <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary">KIVORA SELLER</p>
          <h1 className="mt-1 truncate font-display text-2xl font-bold md:text-3xl">Hello, {shopName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your shop at a glance today.</p>
        </div>
        <Button asChild size="icon" className="rounded-xl"><Link to="/seller/products/new" aria-label="Add product"><Plus /></Link></Button>
      </div>

      <section className="relative overflow-hidden rounded-2xl bg-secondary p-5 text-secondary-foreground shadow-xl md:p-6">
        <div className="absolute -bottom-12 -right-8 h-40 w-40 rounded-full bg-primary/20" />
        <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-sm opacity-75"><Wallet size={16} /> Available balance</div>
            <p className="mt-2 font-display text-3xl font-bold md:text-4xl">{formatGHC(Number(wallet?.balance ?? 0))}</p>
            <p className="mt-2 text-xs opacity-65">{formatGHC(Number(wallet?.pending ?? 0))} pending · {formatGHC(Number(wallet?.total_earned ?? 0))} earned</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="border-secondary-foreground/20 bg-secondary-foreground/10 text-secondary-foreground hover:bg-secondary-foreground/20"><Link to="/seller/wallet">Withdraw</Link></Button>
            <Button asChild><Link to="/seller/wallet">Details</Link></Button>
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Approved" value={approved} icon={CheckCircle2} color="text-success" />
        <Stat label="Pending" value={pending} icon={Clock} color="text-warning" />
        <Stat label="Rejected" value={rejected} icon={Package} color="text-destructive" />
        <Stat label="Inventory value" value={formatGHC(totalValue)} icon={TrendingUp} color="text-primary" />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Quick actions</h2><Link to="/seller/products" className="text-xs font-bold text-primary">View products</Link></div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[{ to: "/seller/products/new", label: "Add item", icon: Plus }, { to: "/seller/orders", label: "Orders", icon: ShoppingBag }, { to: "/seller/messages", label: "Messages", icon: MessageCircle }, { to: "/seller/wallet", label: "Wallet", icon: Wallet }].map(({ to, label, icon: Icon }, index) => (
            <Link key={to} to={to} className="group flex min-w-0 flex-col items-center gap-2 text-center text-xs font-semibold text-muted-foreground">
              <span className={`grid aspect-square w-full max-w-16 place-items-center rounded-xl border border-border transition group-hover:-translate-y-0.5 ${index === 0 ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}><Icon size={21} /></span>
              <span className="w-full truncate">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.75fr)]">
        <section className="dashboard-panel">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-primary">LATEST SALES</p><h2 className="font-display text-xl font-bold">Recent orders</h2></div><Link to="/seller/orders" className="text-xs font-bold text-primary">View all</Link></div>
          <div className="mt-3 divide-y divide-border">
            {orders.slice(0, 4).map((order) => (
              <Link key={order.id} to="/seller/orders/$id" params={{ id: order.id }} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Package size={19} /></div>
                <div className="min-w-0"><p className="truncate text-sm font-bold">{order.items.map((item) => item.name).join(", ")}</p><p className="text-xs text-muted-foreground">#{order.order_number} · {new Date(order.created_at).toLocaleDateString()}</p></div>
                <div className="text-right"><p className="text-sm font-bold">{formatGHC(order.subtotal)}</p><p className="text-[10px] font-bold uppercase text-primary">{order.status}</p></div>
              </Link>
            ))}
            {orders.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Your recent orders will appear here.</p>}
          </div>
        </section>

        <section className="dashboard-panel">
          <p className="text-xs font-bold text-primary">SHOP HEALTH</p>
          <h2 className="font-display text-xl font-bold">Catalogue status</h2>
          <div className="mt-5 space-y-4">
            <HealthRow label="Live products" value={approved} total={products?.length ?? 0} />
            <HealthRow label="Awaiting approval" value={pending} total={products?.length ?? 0} />
            <HealthRow label="Stock units" value={products?.reduce((sum, product) => sum + (product.stock ?? 0), 0) ?? 0} total={Math.max(1, products?.reduce((sum, product) => sum + (product.stock ?? 0), 0) ?? 0)} />
          </div>
          <Link to="/seller/products" className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-bold">Manage catalogue <ArrowRight size={15} /></Link>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  return (
    <div className="dashboard-stat">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><Icon size={18} className={color} /></div>
      <p className="mt-4 font-display text-xl font-bold md:text-2xl">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function HealthRow({ label, value, total }: { label: string; value: number; total: number }) {
  const width = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-bold">{value}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} /></div>
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

