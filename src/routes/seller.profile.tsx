import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSellerProfile } from "@/hooks/use-seller";

export const Route = createFileRoute("/seller/profile")({ component: SellerProfilePage });

const GH_REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Volta", "Northern", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Western North", "Oti", "Savannah", "North East",
];

function SellerProfilePage() {
  const { user } = useAuth();
  const { data: profile, refetch } = useSellerProfile(user);
  const [shop, setShop] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [doorFee, setDoorFee] = useState("25");
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [pickupStation, setPickupStation] = useState("");
  const [pickupRegion, setPickupRegion] = useState("Greater Accra");
  const [pickupFee, setPickupFee] = useState("10");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setShop(profile.shop_name ?? "");
      setBio(profile.bio ?? "");
      setPhone(profile.phone ?? "");
      setDoorFee(String((profile as any).door_delivery_fee ?? 25));
      setPickupEnabled(Boolean((profile as any).pickup_enabled));
      setPickupStation((profile as any).pickup_station ?? "");
      setPickupRegion((profile as any).pickup_region ?? "Greater Accra");
      setPickupFee(String((profile as any).pickup_fee ?? 10));
    }
  }, [profile]);

  if (!user) return <p className="p-6 text-sm">Please log in.</p>;
  if (!profile) return <p className="p-6 text-sm">No shop yet — submit an application from the Dashboard.</p>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pickupEnabled && !pickupStation.trim()) {
      return toast.error("Enter a pickup station name or turn pickup off");
    }
    setBusy(true);
    const { error } = await supabase
      .from("seller_profiles")
      .update({
        shop_name: shop,
        bio: bio || null,
        phone: phone || null,
        door_delivery_fee: Math.max(0, Number(doorFee) || 0),
        pickup_enabled: pickupEnabled,
        pickup_station: pickupEnabled ? pickupStation.trim() : null,
        pickup_region: pickupEnabled ? pickupRegion : null,
        pickup_fee: Math.max(0, Number(pickupFee) || 0),
      } as any)
      .eq("user_id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Shop updated");
    refetch();
  };

  const inputCls = "w-full border-2 border-border rounded-md px-4 py-3 bg-background text-foreground outline-none focus:border-primary";

  return (
    <form onSubmit={save} className="p-4 max-w-md mx-auto space-y-3">
      <h2 className="text-xl font-bold text-foreground">Shop Details</h2>
      <p className="text-xs text-muted-foreground">Status: <span className="font-bold uppercase">{profile.status}</span></p>
      <input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="Shop name" className={inputCls} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={inputCls} />
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="About your shop" className={inputCls} />

      <div className="pt-2 border-t border-border space-y-3">
        <h3 className="font-bold text-foreground">Delivery Settings</h3>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Door delivery fee (GH₵)</label>
          <input
            type="number" min="0" step="0.01" inputMode="decimal"
            value={doorFee} onChange={(e) => setDoorFee(e.target.value)}
            placeholder="25" className={inputCls}
          />
          <p className="text-[11px] text-muted-foreground mt-1">Charged to buyers who choose door delivery from your store.</p>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input type="checkbox" checked={pickupEnabled} onChange={(e) => setPickupEnabled(e.target.checked)} />
          Offer a pickup station
        </label>

        {pickupEnabled && (
          <div className="space-y-3 pl-1">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Pickup station name / address</label>
              <input value={pickupStation} onChange={(e) => setPickupStation(e.target.value)} placeholder="e.g. Kivora Store, Adum" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Region</label>
              <select value={pickupRegion} onChange={(e) => setPickupRegion(e.target.value)} className={inputCls}>
                {GH_REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Pickup fee (GH₵)</label>
              <input
                type="number" min="0" step="0.01" inputMode="decimal"
                value={pickupFee} onChange={(e) => setPickupFee(e.target.value)}
                placeholder="10" className={inputCls}
              />
            </div>
          </div>
        )}
      </div>

      <button disabled={busy} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-md disabled:opacity-60">
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
