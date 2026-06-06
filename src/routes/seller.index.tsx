import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Package, Clock, CheckCircle2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsSeller, useSellerProfile } from "@/hooks/use-seller";
import { formatGHC } from "@/lib/store";

export const Route = createFileRoute("/seller/")({ component: SellerDashboard });

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

  return <Overview userId={user.id} shopName={profile?.shop_name ?? "Your shop"} />;
}

function Overview({ userId, shopName }: { userId: string; shopName: string }) {
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

  const approved = products?.filter((p) => p.approval_status === "approved").length ?? 0;
  const pending = products?.filter((p) => p.approval_status === "pending").length ?? 0;
  const rejected = products?.filter((p) => p.approval_status === "rejected").length ?? 0;
  const totalValue = products?.reduce((s, p) => s + Number(p.price) * (p.stock ?? 0), 0) ?? 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
        <div className="w-12 h-12 rounded-full bg-[#ff7a00] flex items-center justify-center text-white">
          <Store size={22} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Welcome to</p>
          <h2 className="font-bold text-lg">{shopName}</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Approved" value={approved} icon={CheckCircle2} color="text-green-600" />
        <Stat label="Pending" value={pending} icon={Clock} color="text-amber-600" />
        <Stat label="Rejected" value={rejected} icon={Package} color="text-red-600" />
        <Stat label="Inventory" value={formatGHC(totalValue)} icon={Package} color="text-primary" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/seller/products" className="bg-primary text-primary-foreground rounded-xl p-4 font-bold text-center">
          Manage Products
        </Link>
        <Link to="/seller/products/new" className="bg-foreground text-background rounded-xl p-4 font-bold text-center">
          + Add Product
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <Icon size={18} className={color} />
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
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

