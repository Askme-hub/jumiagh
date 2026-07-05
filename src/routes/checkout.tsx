import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ChevronRight, MapPin, CreditCard, ShieldCheck, Truck, Store, Plus, Check, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { formatGHC, useShop } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { initiatePaystackCheckout } from "@/lib/paystack.functions";
import { placeCODOrder } from "@/lib/cod.functions";
import { useAddresses, useSaveAddress, useDeleteAddress, type Address } from "@/lib/addresses";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Checkout – Jumia Ghana" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
});

const GH_REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Volta", "Northern", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Western North", "Oti", "Savannah", "North East",
];

const PICKUP_STATIONS: Record<string, string[]> = {
  "Greater Accra": ["Jumia Pickup Station Accra Central", "Jumia Pickup Station East Legon", "Jumia Pickup Station Tema"],
  "Ashanti": ["Jumia Pickup Station Adum", "Jumia Pickup Station Abuakwa", "Jumia Pickup Station KNUST"],
  "Western": ["Jumia Pickup Station Takoradi"],
  "Central": ["Jumia Pickup Station Cape Coast"],
  "Eastern": ["Jumia Pickup Station Koforidua"],
  "Northern": ["Jumia Pickup Station Tamale"],
};

const Schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20).regex(/^[0-9+\-\s()]+$/, "Digits only"),
  region: z.string().min(2, "Select a region"),
  city: z.string().trim().min(2, "Enter a city").max(80),
  address: z.string().trim().min(5, "Enter a delivery address").max(500),
  notes: z.string().trim().max(500).optional(),
  label: z.string().trim().max(40).optional(),
});

function Checkout() {
  const router = useRouter();
  const cart = useShop((s) => s.cart);
  const clearCart = useShop((s) => s.clearCart);
  const itemsTotal = useShop((s) => s.cartTotal());
  const itemCount = cart.reduce((a, c) => a + c.qty, 0);
  const initCheckout = useServerFn(initiatePaystackCheckout);
  const placeCOD = useServerFn(placeCODOrder);

  const { data: addresses = [], isLoading: loadingAddrs } = useAddresses();
  const saveAddress = useSaveAddress();
  const deleteAddress = useDeleteAddress();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"door" | "pickup">("door");
  const [pickupStation, setPickupStation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");

  const [form, setForm] = useState({
    label: "Home", full_name: "", phone: "", region: "Greater Accra",
    city: "", address: "", notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [paying, setPaying] = useState(false);

  // Pick default address once loaded
  useEffect(() => {
    if (selectedId || addresses.length === 0) {
      if (addresses.length === 0 && !loadingAddrs) setShowForm(true);
      return;
    }
    const def = addresses.find((a) => a.is_default) ?? addresses[0];
    setSelectedId(def.id);
    setDeliveryType((def.delivery_type as "door" | "pickup") ?? "door");
    setPickupStation(def.pickup_station ?? "");
  }, [addresses, selectedId, loadingAddrs]);

  const selected = useMemo(
    () => addresses.find((a) => a.id === selectedId) ?? null,
    [addresses, selectedId]
  );

  const activeRegion = selected?.region ?? form.region;
  const stations = PICKUP_STATIONS[activeRegion] ?? [];

  const { shipping, discount, grand } = useMemo(() => {
    const ship = deliveryType === "pickup" ? 10 : (itemsTotal >= 150 ? 0 : 25);
    const disc = deliveryType === "pickup" && itemsTotal >= 150 ? 10 : 0;
    return { shipping: ship, discount: disc, grand: Math.max(0, itemsTotal + ship - disc) };
  }, [deliveryType, itemsTotal]);

  useEffect(() => {
    // Wait for zustand persist hydration before redirecting on empty cart
    const id = setTimeout(() => {
      if (useShop.getState().cart.length === 0 && !paying) router.navigate({ to: "/cart" });
    }, 300);
    return () => clearTimeout(id);
  }, [cart.length, paying, router]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const submitNewAddress = async () => {
    const parsed = Schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      toast.error("Please complete address");
      return;
    }
    try {
      const saved = await saveAddress.mutateAsync({
        label: parsed.data.label ?? "Home",
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        region: parsed.data.region,
        city: parsed.data.city,
        address: parsed.data.address,
        notes: parsed.data.notes ?? null,
        delivery_type: "door",
        pickup_station: null,
        is_default: saveAsDefault || addresses.length === 0,
      });
      setSelectedId(saved.id);
      setShowForm(false);
      toast.success("Address saved");
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
    }
  };

  const pay = async () => {
    if (!selected) { toast.error("Add a delivery address"); setShowForm(true); return; }
    if (deliveryType === "pickup" && !pickupStation) { toast.error("Pick a pickup station"); return; }
    setPaying(true);
    const deliveryPayload = {
      name: selected.full_name,
      phone: selected.phone,
      region: selected.region,
      city: selected.city,
      address: selected.address,
      notes: selected.notes ?? "",
      delivery_type: deliveryType,
      pickup_station: deliveryType === "pickup" ? pickupStation : "",
    };
    const itemsPayload = cart.map((c) => ({
      product_id: c.product.id,
      name: c.product.name,
      price: Number(c.product.price),
      old_price: c.product.oldPrice ?? null,
      image_url: c.product.image ?? null,
      qty: c.qty,
    }));
    try {
      if (paymentMethod === "cod") {
        const res = await placeCOD({ data: { delivery: deliveryPayload, items: itemsPayload } });
        clearCart();
        toast.success("Order placed! Pay on delivery.");
        router.navigate({ to: "/orders/$id", params: { id: res.order_id } });
        return;
      }
      const res = await initCheckout({
        data: {
          callbackOrigin: window.location.origin,
          delivery: { ...deliveryPayload, shipping_fee: shipping, discount },
          items: itemsPayload,
        },
      });
      clearCart();
      window.location.href = res.authorization_url;
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
      setPaying(false);
    }
  };

  return (
    <div className="pb-32">
      <PageHeader title="Checkout" />

      <ol className="flex items-center gap-1 px-4 py-3 text-[11px] font-bold uppercase bg-card border-b border-border">
        <li className="text-primary">1. Delivery</li>
        <ChevronRight size={12} className="text-muted-foreground" />
        <li className="text-primary">2. Payment</li>
        <ChevronRight size={12} className="text-muted-foreground" />
        <li className="text-muted-foreground">3. Confirmation</li>
      </ol>

      {/* Saved addresses */}
      <section className="bg-card mt-2">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <MapPin size={18} className="text-primary" />
          <h2 className="font-bold flex-1">Delivery Address</h2>
          {addresses.length > 0 && (
            <button onClick={() => setShowForm((s) => !s)} className="text-primary text-xs font-bold flex items-center gap-1">
              <Plus size={14} /> {showForm ? "Cancel" : "Add new"}
            </button>
          )}
        </div>

        {loadingAddrs && <div className="p-4 text-sm text-muted-foreground">Loading saved addresses…</div>}

        {!loadingAddrs && addresses.length > 0 && (
          <div className="p-3 space-y-2">
            {addresses.map((a) => (
              <AddressCard
                key={a.id}
                a={a}
                selected={selectedId === a.id}
                onSelect={() => { setSelectedId(a.id); setShowForm(false); }}
                onDelete={() => {
                  if (confirm("Delete this address?")) {
                    deleteAddress.mutate(a.id, {
                      onSuccess: () => { if (selectedId === a.id) setSelectedId(null); toast.success("Deleted"); },
                    });
                  }
                }}
              />
            ))}
          </div>
        )}

        {(showForm || addresses.length === 0) && (
          <div className="p-4 space-y-3 border-t border-border">
            <p className="text-xs font-bold uppercase text-muted-foreground">New Address</p>
            <Field label="Address label (e.g. Home, Work)" value={form.label} onChange={(v) => set("label", v)} error={errors.label} placeholder="Home" />
            <Field label="Full name" value={form.full_name} onChange={(v) => set("full_name", v)} error={errors.full_name} placeholder="Kwame Mensah" />
            <Field label="Phone number" value={form.phone} onChange={(v) => set("phone", v)} error={errors.phone} placeholder="024 000 0000" type="tel" inputMode="tel" />
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Region</label>
              <select value={form.region} onChange={(e) => set("region", e.target.value)} className="w-full border border-border rounded px-3 py-2.5 bg-background text-sm">
                {GH_REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <Field label="City / Town" value={form.city} onChange={(v) => set("city", v)} error={errors.city} placeholder="Accra" />
            <Field label="Delivery address" value={form.address} onChange={(v) => set("address", v)} error={errors.address} placeholder="House no., street, landmark" textarea />
            <Field label="Additional notes (optional)" value={form.notes} onChange={(v) => set("notes", v)} placeholder="Gate code, time window…" textarea />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={saveAsDefault} onChange={(e) => setSaveAsDefault(e.target.checked)} />
              Set as default address
            </label>
            <button
              onClick={submitNewAddress}
              disabled={saveAddress.isPending}
              className="w-full bg-foreground text-background font-bold py-3 rounded-md disabled:opacity-60"
            >
              {saveAddress.isPending ? "Saving…" : "Save address"}
            </button>
          </div>
        )}
      </section>

      {/* Delivery method */}
      {selected && (
        <section className="bg-card mt-2">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-bold">Delivery Method</h2>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setDeliveryType("door")}
              className={`p-3 rounded border-2 text-left ${deliveryType === "door" ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <Truck size={18} className="text-primary mb-1" />
              <p className="font-bold text-sm">Door Delivery</p>
              <p className="text-xs text-muted-foreground">3–7 business days</p>
            </button>
            <button
              onClick={() => setDeliveryType("pickup")}
              className={`p-3 rounded border-2 text-left ${deliveryType === "pickup" ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <Store size={18} className="text-primary mb-1" />
              <p className="font-bold text-sm">Pickup Station</p>
              <p className="text-xs text-success font-semibold">Save GH₵ 10</p>
            </button>
          </div>

          {deliveryType === "pickup" && (
            <div className="p-3 pt-0 space-y-2">
              {stations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pickup stations in {activeRegion}. Use Door Delivery.</p>
              ) : stations.map((s) => (
                <button
                  key={s}
                  onClick={() => setPickupStation(s)}
                  className={`w-full text-left p-3 rounded border ${pickupStation === s ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{s}</p>
                    <span className="text-xs font-bold bg-secondary px-2 py-0.5 rounded">GH₵ 10</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Payment method */}
      <section className="bg-card mt-2">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
          <CreditCard size={18} className="text-primary" />
          <h2 className="font-bold">Payment Method</h2>
        </div>
        <div className="p-3 space-y-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("online")}
            className={`w-full text-left p-3 border-2 rounded ${paymentMethod === "online" ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Pay Online (Paystack)</p>
                <p className="text-xs text-muted-foreground">Card · MTN MoMo · Vodafone Cash · AirtelTigo · Bank</p>
              </div>
              {paymentMethod === "online" && (
                <span className="text-xs font-bold bg-success/10 text-success px-2 py-1 rounded">SELECTED</span>
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("cod")}
            className={`w-full text-left p-3 border-2 rounded ${paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Pay on Delivery</p>
                <p className="text-xs text-muted-foreground">Pay the seller in cash or MoMo when your product arrives</p>
              </div>
              {paymentMethod === "cod" && (
                <span className="text-xs font-bold bg-success/10 text-success px-2 py-1 rounded">SELECTED</span>
              )}
            </div>
          </button>
        </div>
      </section>

      {/* Order summary */}
      <section className="bg-card mt-2">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-bold">Order Summary</h2>
          <Link to="/cart" className="text-xs text-primary font-semibold">Modify cart</Link>
        </div>
        <div className="px-4 py-3 space-y-2 text-sm">
          <Row label={`Item's total (${itemCount})`} value={formatGHC(itemsTotal)} />
          <Row label="Shipping fees" value={shipping === 0 ? "FREE" : formatGHC(shipping)} />
          {discount > 0 && <Row label="Prepaid Delivery Discount" value={`-${formatGHC(discount)}`} valueClass="text-success font-bold" />}
          <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
            <span>Total</span><span>{formatGHC(grand)}</span>
          </div>
        </div>
      </section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground px-4 py-3">
        <ShieldCheck size={14} className="text-success" />
        {paymentMethod === "cod"
          ? "No payment now — pay the courier when your order is delivered."
          : "Your payment is encrypted and securely processed by Paystack."}
      </p>

      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-card border-t border-border p-3 z-40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="font-bold text-lg">{formatGHC(grand)}</span>
        </div>
        <button
          onClick={pay}
          disabled={paying || cart.length === 0 || !selected}
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-md disabled:opacity-60"
        >
          {paying
            ? paymentMethod === "cod" ? "Placing order…" : "Redirecting to Paystack…"
            : paymentMethod === "cod" ? `Place order · ${formatGHC(grand)}` : `Confirm order · ${formatGHC(grand)}`}
        </button>
      </div>
    </div>
  );
}

function AddressCard({ a, selected, onSelect, onDelete }: {
  a: Address; selected: boolean; onSelect: () => void; onDelete: () => void;
}) {
  return (
    <div className={`p-3 rounded border-2 ${selected ? "border-primary bg-primary/5" : "border-border"}`}>
      <button onClick={onSelect} className="w-full text-left flex gap-2">
        <div className="mt-0.5">
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? "border-primary bg-primary" : "border-border"}`}>
            {selected && <Check size={10} className="text-primary-foreground" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm">{a.full_name}</p>
            {a.label && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-semibold uppercase">{a.label}</span>}
            {a.is_default && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-semibold uppercase">Default</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{a.phone}</p>
          <p className="text-sm mt-1">{a.address}</p>
          <p className="text-xs text-muted-foreground">{a.city}, {a.region}</p>
        </div>
      </button>
      <div className="flex justify-end mt-2">
        <button onClick={onDelete} className="text-destructive text-xs font-semibold flex items-center gap-1">
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={valueClass ?? "font-semibold"}>{value}</span></div>;
}

function Field({
  label, value, onChange, error, placeholder, type = "text", inputMode, textarea,
}: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; placeholder?: string; type?: string; inputMode?: any; textarea?: boolean;
}) {
  const cls = `w-full border rounded px-3 py-2.5 bg-background text-sm ${error ? "border-destructive" : "border-border"}`;
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className={cls} />
      ) : (
        <input type={type} inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}
