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

function ApplyForm({ userId, onApplied }: { userId: string; onApplied: () => void }) {
  const [shop, setShop] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop.trim()) return toast.error("Shop name is required");
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

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold">Become a Kivora Seller</h2>
      <p className="text-muted-foreground text-sm mt-1">
        Apply to sell on Kivora. Once approved, you can upload products for review.
      </p>
      <form onSubmit={apply} className="mt-5 space-y-3">
        <input
          required
          placeholder="Shop name *"
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          className="w-full border-2 border-border focus:border-primary rounded-md px-4 py-3 outline-none"
        />
        <input
          placeholder="Phone (e.g. 024 000 0000)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border-2 border-border focus:border-primary rounded-md px-4 py-3 outline-none"
        />
        <textarea
          placeholder="Tell buyers about your shop"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="w-full border-2 border-border focus:border-primary rounded-md px-4 py-3 outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-md disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
