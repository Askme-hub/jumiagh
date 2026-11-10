import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ChevronRight,
  MapPin,
  CreditCard,
  ShieldCheck,
  Truck,
  Store,
  Plus,
  Check,
  Trash2,
  TicketPercent,
  Loader2,
  Package,
  Banknote,
  Smartphone,
  Lock,
  X,
  Home,
  Building2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { formatGHC, useShop } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { initiatePaystackCheckout } from "@/lib/paystack.functions";
import { placeCODOrder } from "@/lib/cod.functions";
import { sendPhoneOTP, verifyPhoneOTP } from "@/lib/phone-otp.functions";
import { validateCoupon } from "@/lib/coupons.functions";
import { useSellerDelivery } from "@/lib/seller-delivery";
import { useAddresses, useSaveAddress, useDeleteAddress, type Address } from "@/lib/addresses";
import { toast } from "sonner";
import { doorDeliveryFee, zoneForRegion, DELIVERY_ZONES } from "@/lib/delivery-zones";
import { useDeliveryZones } from "@/lib/use-delivery-zones";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Checkout – Kivora Ghana" }] }),
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

/** Load Paystack's inline popup script once; returns null if unavailable. */
async function loadPaystack(): Promise<any | null> {
  if (typeof window === "undefined") return null;
  const w = window as any;
  if (w.PaystackPop) return w.PaystackPop;
  return new Promise((resolve) => {
    const existing = document.getElementById("paystack-inline-js") as HTMLScriptElement | null;
    const done = () => resolve((window as any).PaystackPop ?? null);
    if (existing) {
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.id = "paystack-inline-js";
    s.src = "https://js.paystack.co/v2/inline.js";
    s.async = true;
    s.onload = done;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
    setTimeout(() => resolve((window as any).PaystackPop ?? null), 8000);
  });
}

/** Online (Paystack) payments are paused until the live account is ready. */
const ONLINE_PAYMENTS_PAUSED = true;

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
  const sendOtp = useServerFn(sendPhoneOTP);
  const verifyOtp = useServerFn(verifyPhoneOTP);
  const [otpPhone, setOtpPhone] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);
  const requestOtp = async (phone: string) => {
    setOtpPhone(phone);
    setOtpCode("");
    setResendIn(60);
    setOtpSending(true);
    try {
      await sendOtp({ data: { phone } });
      toast.success(`Verification code sent to ${phone}`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not send code");
      setResendIn(0);
    } finally {
      setOtpSending(false);
    }
  };
  const checkCoupon = useServerFn(validateCoupon);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const { data: addresses = [], isLoading: loadingAddrs } = useAddresses();
  const saveAddress = useSaveAddress();
  const deleteAddress = useDeleteAddress();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"door" | "pickup">("door");
  const [pickupStation, setPickupStation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("cod");

  const [form, setForm] = useState({
    label: "Home",
    full_name: "",
    phone: "",
    region: "Greater Accra",
    city: "",
    address: "",
    notes: "",
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
    [addresses, selectedId],
  );
  const selectedRegion = selected?.region ?? "Greater Accra";
  const { data: zones = DELIVERY_ZONES } = useDeliveryZones();
  const zone = zoneForRegion(selectedRegion, zones);

  const sellerIds = useMemo(
    () => cart.map((c) => c.product.sellerId).filter(Boolean) as string[],
    [cart],
  );
  const { data: sellerDelivery = [] } = useSellerDelivery(sellerIds);

  // Pickup stations offered by the sellers in this cart
  const stations = useMemo(
    () =>
      sellerDelivery
        .filter((s) => s.pickup_enabled && s.pickup_station)
        .map((s) => ({
          id: s.user_id,
          label: s.pickup_station as string,
          region: s.pickup_region ?? "",
          fee: s.pickup_fee,
          shop: s.shop_name,
        })),
    [sellerDelivery],
  );

  const { shipping, discount, grand } = useMemo(() => {
    let ship: number;
    if (deliveryType === "pickup") {
      const p = sellerDelivery.filter((s) => s.pickup_enabled).reduce((a, s) => a + s.pickup_fee, 0);
      ship = p > 0 ? p : 10;
    } else {
      ship =
        sellerDelivery.length > 0
          ? doorDeliveryFee(
              selectedRegion,
              sellerDelivery.map((s) => s.door_delivery_fee),
              zones,
            )
          : itemsTotal >= 150
            ? 0
            : zoneForRegion(selectedRegion, zones).fee;
    }
    const couponDiscount = appliedCoupon?.discount ?? 0;
    return {
      shipping: ship,
      discount: couponDiscount,
      grand: Math.max(0, itemsTotal + ship - couponDiscount),
    };
  }, [deliveryType, itemsTotal, sellerDelivery, appliedCoupon, selectedRegion, zones]);

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCheckingCoupon(true);
    try {
      const res = await checkCoupon({
        data: {
          code,
          items: cart.map((c) => ({
            product_id: c.product.id,
            price: Number(c.product.price),
            qty: c.qty,
          })),
        },
      });
      if (!res.valid) {
        setAppliedCoupon(null);
        toast.error(res.message);
      } else {
        setAppliedCoupon({ code: res.code ?? code.toUpperCase(), discount: res.discount });
        toast.success(`Coupon applied — you save ${formatGHC(res.discount)}`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Could not check coupon");
    } finally {
      setCheckingCoupon(false);
    }
  };

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
      parsed.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
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

  // Pay on Delivery only when every shop in the cart is in the buyer's region
  const farShops = sellerDelivery.filter(
    (s) => !s.deliver_all_regions && (s.store_region ?? "") !== selectedRegion,
  );
  const codAllowed = !!selected && farShops.length === 0;
  useEffect(() => {
    if (!codAllowed && paymentMethod === "cod" && !ONLINE_PAYMENTS_PAUSED) setPaymentMethod("online");
  }, [codAllowed, paymentMethod]);

  const blocker = !selected
    ? "Add a delivery address to continue"
    : deliveryType === "pickup" && !pickupStation
      ? "Choose a pickup station to continue"
      : paymentMethod === "cod" && !codAllowed
        ? `Pay on Delivery is only for shops in ${selectedRegion}`
        : cart.length === 0
          ? "Your cart is empty"
          : null;

  const pay = async () => {
    if (!selected) {
      toast.error("Add a delivery address");
      setShowForm(true);
      document.getElementById("address-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (deliveryType === "pickup" && !pickupStation) {
      toast.error("Pick a pickup station");
      document.getElementById("delivery-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
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
        const res = await placeCOD({
          data: {
            delivery: deliveryPayload,
            items: itemsPayload,
            coupon_code: appliedCoupon?.code,
          },
        });
        clearCart();
        toast.success("Order placed! Pay on delivery.");
        router.navigate({ to: "/orders/$id", params: { id: res.order_id } });
        return;
      }
      if (ONLINE_PAYMENTS_PAUSED) {
        toast.info("Online payment is coming soon. Please use Pay on Delivery for now.");
        setPaying(false);
        return;
      }
      const res = await initCheckout({
        data: {
          callbackOrigin: window.location.origin,
          delivery: { ...deliveryPayload, shipping_fee: shipping, discount },
          items: itemsPayload,
          coupon_code: appliedCoupon?.code,
        },
      });

      const done = () => {
        window.location.href = `/payment/callback?ref=${encodeURIComponent(res.reference)}`;
      };
      const PaystackPop = await loadPaystack();
      if (!PaystackPop) {
        window.location.href = res.authorization_url;
        return;
      }
      const popup = new PaystackPop();
      popup.resumeTransaction(res.access_code, {
        onSuccess: done,
        onLoad: () => {},
        onCancel: () => {
          setPaying(false);
          toast.info("Payment cancelled — your cart is still saved.");
        },
        onError: () => {
          setPaying(false);
          toast.error("Payment could not be completed. Your cart is saved.");
        },
      });
    } catch (e: any) {
      setPaying(false);
      if (String(e?.message ?? "").includes("verify your phone")) {
        await requestOtp(selected.phone);
        return;
      }
      toast.error(e.message ?? "Checkout failed");
    }
  };

  // ---------- Order Summary (shared between desktop sticky + mobile) ----------
  const OrderSummaryContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Order Summary</h2>
        <Link
          to="/cart"
          className="text-xs font-medium text-primary hover:underline underline-offset-2"
        >
          Edit cart
        </Link>
      </div>

      {/* Mini cart items */}
      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
        {cart.map((c) => (
          <div key={c.product.id} className="flex gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
              {c.product.image ? (
                <img
                  src={c.product.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package size={18} className="text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{c.product.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Qty {c.qty} · {formatGHC(Number(c.product.price) * c.qty)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
          <span className="font-medium">{formatGHC(itemsTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className={cn("font-medium", shipping === 0 && "text-success")}>
            {shipping === 0 ? "FREE" : formatGHC(shipping)}
          </span>
        </div>
        {deliveryType !== "pickup" && (
          <p className="text-[11px] text-muted-foreground">
            {zone.label} · arrives in {zone.eta}
          </p>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-success">
            <span>Coupon ({appliedCoupon?.code})</span>
            <span className="font-semibold">−{formatGHC(discount)}</span>
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">Total</span>
        <span className="text-xl font-bold tracking-tight">{formatGHC(grand)}</span>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {paymentMethod === "cod"
            ? "No payment now. Pay the courier in cash or MoMo when your order arrives."
            : "Your payment is encrypted and securely processed by Paystack."}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-28 md:pb-10">
      <PageHeader title="Checkout" />

      {/* Progress indicator */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 md:px-6">
          <StepBadge n={1} label="Delivery" active />
          <ChevronRight size={14} className="text-muted-foreground/60" />
          <StepBadge n={2} label="Payment" active />
          <ChevronRight size={14} className="text-muted-foreground/60" />
          <StepBadge n={3} label="Done" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-8">
        <div className="grid gap-5 md:grid-cols-[1fr_340px] md:items-start lg:grid-cols-[1fr_380px]">
          {/* ============ LEFT COLUMN – Form ============ */}
          <div className="space-y-4">
            {/* ---- Delivery Address ---- */}
            <section
              id="address-section"
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 md:px-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <MapPin size={18} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold tracking-tight">Delivery Address</h2>
                  <p className="text-xs text-muted-foreground">Where should we send your order?</p>
                </div>
                {addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowForm((s) => !s)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5"
                  >
                    {showForm ? (
                      <>
                        <X size={14} /> Cancel
                      </>
                    ) : (
                      <>
                        <Plus size={14} /> Add new
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-4 md:p-5">
                {loadingAddrs && (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    Loading saved addresses…
                  </div>
                )}

                {!loadingAddrs && addresses.length > 0 && (
                  <div className="space-y-2.5">
                    {addresses.map((a) => (
                      <AddressCard
                        key={a.id}
                        a={a}
                        selected={selectedId === a.id}
                        onSelect={() => {
                          setSelectedId(a.id);
                          setShowForm(false);
                        }}
                        onDelete={() => {
                          if (confirm("Delete this address?")) {
                            deleteAddress.mutate(a.id, {
                              onSuccess: () => {
                                if (selectedId === a.id) setSelectedId(null);
                                toast.success("Address removed");
                              },
                            });
                          }
                        }}
                      />
                    ))}
                  </div>
                )}

                {(showForm || addresses.length === 0) && (
                  <div
                    className={cn(
                      "space-y-3.5",
                      addresses.length > 0 && "mt-4 border-t border-border pt-4",
                    )}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {addresses.length === 0 ? "Add your first address" : "New address"}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Label"
                        value={form.label}
                        onChange={(v) => set("label", v)}
                        error={errors.label}
                        placeholder="Home, Work…"
                      />
                      <Field
                        label="Full name"
                        value={form.full_name}
                        onChange={(v) => set("full_name", v)}
                        error={errors.full_name}
                        placeholder="Kwame Mensah"
                      />
                    </div>

                    <Field
                      label="Phone number"
                      value={form.phone}
                      onChange={(v) => set("phone", v)}
                      error={errors.phone}
                      placeholder="024 XXX XXXX"
                      inputMode="tel"
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                          Region
                        </label>
                        <select
                          value={form.region}
                          onChange={(e) => set("region", e.target.value)}
                          className={cn(
                            "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
                            errors.region ? "border-destructive" : "border-border",
                          )}
                        >
                          {GH_REGIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        {errors.region && (
                          <p className="mt-1 text-xs text-destructive">{errors.region}</p>
                        )}
                      </div>
                      <Field
                        label="City / Town"
                        value={form.city}
                        onChange={(v) => set("city", v)}
                        error={errors.city}
                        placeholder="Accra, Kumasi…"
                      />
                    </div>

                    <Field
                      label="Street address / Landmark"
                      value={form.address}
                      onChange={(v) => set("address", v)}
                      error={errors.address}
                      placeholder="House number, street, nearby landmark"
                      textarea
                    />

                    <Field
                      label="Delivery notes (optional)"
                      value={form.notes}
                      onChange={(v) => set("notes", v)}
                      error={errors.notes}
                      placeholder="Gate code, preferred time…"
                      textarea
                    />

                    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={saveAsDefault}
                        onChange={(e) => setSaveAsDefault(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>Set as default address</span>
                    </label>

                    <button
                      type="button"
                      onClick={submitNewAddress}
                      disabled={saveAddress.isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
                    >
                      {saveAddress.isPending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Saving…
                        </>
                      ) : (
                        "Save address"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ---- Delivery Method ---- */}
            {selected && (
              <section
                id="delivery-section"
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 md:px-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <Truck size={18} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight">Delivery Method</h2>
                    <p className="text-xs text-muted-foreground">How would you like to receive it?</p>
                  </div>
                </div>

                <div className="p-4 md:p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DeliveryOption
                      selected={deliveryType === "door"}
                      onClick={() => setDeliveryType("door")}
                      icon={<Truck size={20} />}
                      title="Door Delivery"
                      subtitle={`3–7 business days · ${zone.eta}`}
                    />
                    <DeliveryOption
                      selected={deliveryType === "pickup"}
                      onClick={() => setDeliveryType("pickup")}
                      icon={<Store size={20} />}
                      title="Pickup Station"
                      subtitle="Cheaper · Save on delivery"
                      badge="Save ₵10"
                    />
                  </div>

                  {deliveryType === "pickup" && (
                    <div className="mt-4 space-y-2">
                      {stations.length === 0 ? (
                        <p className="rounded-xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
                          No pickup stations available for these items. Please use Door Delivery.
                        </p>
                      ) : (
                        stations.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setPickupStation(s.label)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition",
                              pickupStation === s.label
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40",
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{s.label}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {s.shop}
                                {s.region ? ` · ${s.region}` : ""}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold">
                              {formatGHC(s.fee)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ---- Payment Method ---- */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 md:px-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <CreditCard size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Payment Method</h2>
                  <p className="text-xs text-muted-foreground">Choose how you want to pay</p>
                </div>
              </div>

              <div className="space-y-3 p-4 md:p-5">
                {/* Online – coming soon */}
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Online payment is coming soon. Please use Pay on Delivery for now.")
                  }
                  className="relative flex w-full items-start gap-3.5 rounded-xl border-2 border-border px-4 py-3.5 text-left opacity-60"
                >
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Smartphone size={20} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Pay Online</p>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
                        Coming soon
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Card · Mobile Money · Bank transfer
                    </p>
                  </div>
                </button>

                {/* COD */}
                <button
                  type="button"
                  onClick={() => {
                    if (!codAllowed) {
                      toast.error(
                        `Pay on Delivery is only available when the shop is in ${selectedRegion}.`,
                      );
                      return;
                    }
                    setPaymentMethod("cod");
                  }}
                  disabled={!codAllowed}
                  className={cn(
                    "relative flex w-full items-start gap-3.5 rounded-xl border-2 px-4 py-3.5 text-left transition",
                    !codAllowed
                      ? "cursor-not-allowed border-border opacity-50"
                      : paymentMethod === "cod"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      paymentMethod === "cod" && codAllowed
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Banknote size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">Pay on Delivery</p>
                      {paymentMethod === "cod" && codAllowed && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                          <Check size={10} /> Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Pay the seller in cash or MoMo when your product arrives
                    </p>
                    {selected &&
                      (codAllowed ? (
                        <p className="mt-1.5 text-[11px] font-medium text-success">
                          Available for shops in {selectedRegion}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] font-medium text-destructive">
                          Only available when all shops are in your region.{" "}
                          {farShops
                            .map((f) => `${f.shop_name} is in ${f.store_region ?? "another region"}`)
                            .join("; ")}
                          .
                        </p>
                      ))}
                  </div>
                  {paymentMethod === "cod" && codAllowed && (
                    <div className="absolute right-3.5 top-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  )}
                </button>
              </div>
            </section>

            {/* ---- Coupon ---- */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 md:px-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <TicketPercent size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Coupon Code</h2>
                  <p className="text-xs text-muted-foreground">Have a promo code? Apply it here</p>
                </div>
              </div>

              <div className="p-4 md:p-5">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-success/10 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-success">{appliedCoupon.code}</p>
                      <p className="text-xs text-success/90">
                        You save {formatGHC(appliedCoupon.discount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponInput("");
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/10"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm uppercase tracking-wide outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={checkingCoupon || !couponInput.trim()}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {checkingCoupon && <Loader2 size={14} className="animate-spin" />}
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Mobile-only order summary (appears above sticky bar) */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:hidden">
              <div className="p-4">
                <OrderSummaryContent />
              </div>
            </section>
          </div>

          {/* ============ RIGHT COLUMN – Sticky summary (desktop) ============ */}
          <aside className="hidden md:block">
            <div className="sticky top-6 space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
                <OrderSummaryContent />
              </div>

              {blocker && (
                <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs font-medium text-warning">
                  {blocker}
                </div>
              )}

              <button
                type="button"
                onClick={pay}
                disabled={paying || !!blocker}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition",
                  blocker
                    ? "cursor-not-allowed bg-primary/50"
                    : "bg-primary hover:bg-primary/90 active:scale-[0.98]",
                )}
              >
                {paying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Processing…
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    {paymentMethod === "cod" ? "Place Order · Pay on Delivery" : "Pay Securely"}
                  </>
                )}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck size={12} className="text-success" />
                Secure checkout · SSL encrypted
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* ============ Mobile sticky bottom bar ============ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
        <div className="mx-auto max-w-md px-4 py-3">
          {blocker && (
            <p className="mb-2 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
              {blocker}
            </p>
          )}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total to pay</span>
            <span className="text-lg font-bold tracking-tight">{formatGHC(grand)}</span>
          </div>
          <button
            type="button"
            onClick={pay}
            disabled={paying || !!blocker}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-primary-foreground transition",
              blocker
                ? "cursor-not-allowed bg-primary/50"
                : "bg-primary hover:bg-primary/90 active:scale-[0.98]",
            )}
          >
            {paying ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Processing…
              </>
            ) : (
              <>
                <Lock size={16} />
                {paymentMethod === "cod" ? "Place Order" : "Pay Securely"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* OTP modal (kept from original) */}
      {otpPhone && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl">
            <h3 className="text-base font-semibold">Verify your phone</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the code sent to <span className="font-medium text-foreground">{otpPhone}</span>
            </p>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              inputMode="numeric"
              className="mt-4 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOtpPhone(null);
                  setOtpCode("");
                }}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={otpBusy || otpCode.length < 4}
                onClick={async () => {
                  setOtpBusy(true);
                  try {
                    await verifyOtp({ data: { phone: otpPhone, code: otpCode } });
                    toast.success("Phone verified");
                    setOtpPhone(null);
                    setOtpCode("");
                    // Retry payment
                    pay();
                  } catch (e: any) {
                    toast.error(e.message ?? "Invalid code");
                  } finally {
                    setOtpBusy(false);
                  }
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {otpBusy ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
              </button>
            </div>
            <button
              type="button"
              disabled={resendIn > 0 || otpSending}
              onClick={() => requestOtp(otpPhone)}
              className="mt-3 w-full text-center text-xs font-medium text-primary disabled:text-muted-foreground"
            >
              {otpSending
                ? "Sending…"
                : resendIn > 0
                  ? `Resend code in ${resendIn}s`
                  : "Resend code"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                              */
/* -------------------------------------------------------------------------- */

function StepBadge({ n, label, active }: { n: number; label: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {n}
      </span>
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function DeliveryOption({
  selected,
  onClick,
  icon,
  title,
  subtitle,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/40",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        {badge && (
          <span className="mt-1.5 inline-block rounded-md bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
            {badge}
          </span>
        )}
      </div>
      {selected && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check size={12} className="text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

function AddressCard({
  a,
  selected,
  onSelect,
  onDelete,
}: {
  a: Address;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const LabelIcon = a.label?.toLowerCase().includes("work") ? Building2 : Home;

  return (
    <div
      className={cn(
        "rounded-xl border-2 transition",
        selected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30",
      )}
    >
      <button type="button" onClick={onSelect} className="flex w-full gap-3 p-3.5 text-left">
        <div className="mt-0.5 shrink-0">
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2",
              selected ? "border-primary bg-primary" : "border-border",
            )}
          >
            {selected && <Check size={11} className="text-primary-foreground" />}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold">{a.full_name}</p>
            {a.label && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                <LabelIcon size={10} />
                {a.label}
              </span>
            )}
            {a.is_default && (
              <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                Default
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{a.phone}</p>
          <p className="mt-1 text-sm leading-snug">{a.address}</p>
          <p className="text-xs text-muted-foreground">
            {a.city}, {a.region}
          </p>
        </div>
      </button>
      <div className="flex justify-end border-t border-border/60 px-3 py-1.5">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  inputMode,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  textarea?: boolean;
}) {
  const cls = cn(
    "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
    error ? "border-destructive" : "border-border",
  );
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={cls}
        />
      ) : (
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
