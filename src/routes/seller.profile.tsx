import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSellerProfile } from "@/hooks/use-seller";

export const Route = createFileRoute("/seller/profile")({ component: SellerProfilePage });

function SellerProfilePage() {
  const { user } = useAuth();
  const { data: profile, refetch } = useSellerProfile(user);
  const [shop, setShop] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setShop(profile.shop_name ?? "");
      setBio(profile.bio ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  if (!user) return <p className="p-6 text-sm">Please log in.</p>;
  if (!profile) return <p className="p-6 text-sm">No shop yet — submit an application from the Dashboard.</p>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("seller_profiles")
      .update({ shop_name: shop, bio: bio || null, phone: phone || null })
      .eq("user_id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Shop updated");
    refetch();
  };

  return (
    <form onSubmit={save} className="p-4 max-w-md mx-auto space-y-3">
      <h2 className="text-xl font-bold">Shop Details</h2>
      <p className="text-xs text-muted-foreground">Status: <span className="font-bold uppercase">{profile.status}</span></p>
      <input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="Shop name" className="w-full border-2 border-border rounded-md px-4 py-3 outline-none focus:border-primary" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full border-2 border-border rounded-md px-4 py-3 outline-none focus:border-primary" />
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="About your shop" className="w-full border-2 border-border rounded-md px-4 py-3 outline-none focus:border-primary" />
      <button disabled={busy} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-md disabled:opacity-60">
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
