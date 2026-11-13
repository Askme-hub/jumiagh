import { ClientOnly, createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/checkout")({
  component: () => <ClientOnly fallback={<PageHeader title="Checkout" />}><Checkout /></ClientOnly>,
  head: () => ({ meta: [
    { title: "Delivery & Payment – Kivora Ghana" },
    { name: "description", content: "Choose your delivery address and payment method, then review your Kivora order." },
    { property: "og:title", content: "Delivery & Payment – Kivora Ghana" },
    { property: "og:description", content: "Review your delivery details and securely complete your Kivora order." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
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
  const [mobileStep, setMobileStep] = useState<"delivery" | "payment">("delivery");
  const [paymentChoicesOpen, setPaymentChoicesOpen] = useState(true);
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
        <h2 className="text-base font-semibold tracking-normal">Order Summary</h2>
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
        <span className="text-xl font-bold tracking-normal">{formatGHC(grand)}</span>
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
    <div className="min-h-[calc(100vh-4rem)] pb-56 md:pb-10">
      <PageHeader title={mobileStep === "delivery" ? "Delivery" : "Payment"} />

      {/* Progress indicator */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 md:px-6">
          <Button variant="ghost" size="sm" onClick={() => setMobileStep("delivery")} aria-label="Edit delivery"><StepBadge n={1} label="Delivery" active={mobileStep === "delivery"} /></Button>
          <ChevronRight size={14} className="text-muted-foreground/60" />
          <StepBadge n={2} label="Payment" active={mobileStep === "payment"} />
          <ChevronRight size={14} className="text-muted-foreground/60" />
          <StepBadge n={3} label="Done" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-0 py-4 md:px-6 md:py-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_340px] md:items-start lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ============ LEFT COLUMN – Form ============ */}
          <div className="min-w-0 space-y-4">
            {/* Delivery methods remain available before an address is saved. */}
            <section id="delivery-section" className={cn("border-y border-border bg-card", mobileStep !== "delivery" && "hidden md:block")}>
              <h2 className="px-4 pt-4 text-sm font-semibold">Delivery Method</h2>
              <Tabs value={deliveryType} onValueChange={(value) => setDeliveryType(value as "door" | "pickup")} className="mt-3">
                <TabsList className="grid h-12 w-full grid-cols-2 rounded-none bg-muted p-0">
                  <TabsTrigger value="pickup" className="h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"><Store size={16} />Pickup Stations</TabsTrigger>
                  <TabsTrigger value="door" className="h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"><Truck size={16} />Door Delivery</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="p-4">
                {deliveryType === "door" ? (
                  <div className="flex gap-3 text-sm"><Truck className="shrink-0 text-primary" size={22} /><div><p className="font-semibold">Delivered to your address</p><p className="mt-1 text-xs text-muted-foreground">{zone.label} · {zone.eta}</p></div></div>
                ) : stations.length === 0 ? (
                  <div className="py-5 text-center"><Store size={48} strokeWidth={1.2} className="mx-auto text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No pickup stations available</p><p className="mx-auto mt-2 max-w-xs text-xs text-muted-foreground">The shops in your cart do not currently offer a pickup station.</p><Button variant="outline" className="mt-4" onClick={() => setDeliveryType("door")}><Truck size={16} />Use Door Delivery</Button></div>
                ) : (
                  <div className="space-y-2">{stations.map((station) => <Button key={station.id} variant="outline" aria-pressed={pickupStation === station.label} onClick={() => setPickupStation(station.label)} className={cn("h-auto w-full justify-between whitespace-normal px-3 py-3 text-left", pickupStation === station.label && "border-primary bg-primary-soft")}><span className="min-w-0"><span className="block text-sm font-semibold">{station.label}</span><span className="block text-xs text-muted-foreground">{station.shop} · {station.region}</span></span><span className="shrink-0 text-sm">{formatGHC(station.fee)}</span></Button>)}</div>
                )}
              </div>
            </section>

            {/* ---- Delivery Address ---- */}
            <section
              id="address-section"
              className={cn("border-y border-border bg-card", mobileStep !== "delivery" && "hidden md:block")}
            >
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 md:px-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <MapPin size={18} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold tracking-normal">Delivery Address</h2>
                  <p className="text-xs text-muted-foreground">Where should we send your order?</p>
                </div>
                {addresses.length > 0 && (
                  <Button variant="ghost"
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
                  </Button>
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
                      label="Ghana phone number (+233)"
                      value={form.phone}
                      onChange={(v) => set("phone", v)}
                      error={errors.phone}
                      placeholder="024 XXX XXXX or +233 24 XXX XXXX"
                      type="tel"
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

                    <Button variant="ghost"
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
                    </Button>
                  </div>
                )}
              </div>
            </section>

            {/* ---- Payment Method ---- */}
            <section className={cn("border-y border-border bg-card", mobileStep !== "payment" && "hidden md:block")}>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 md:px-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <CreditCard size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-normal">Payment Method</h2>
                  <p className="text-xs text-muted-foreground">Choose how you want to pay</p>
                </div>
              </div>

              <div className="space-y-3 p-4 md:p-5">
                <Button variant="ghost" onClick={() => setPaymentChoicesOpen((open) => !open)} aria-expanded={paymentChoicesOpen} className="h-auto w-full justify-between whitespace-normal border-b border-border px-0 pb-3"><span>Pre-pay with card or Mobile Money</span><ChevronRight size={16} className={cn(paymentChoicesOpen && "rotate-90")} /></Button>
                {paymentChoicesOpen && <div className="divide-y divide-border">
                  {[
                    { title: "Debit / Credit Card", detail: "Visa · Mastercard", icon: CreditCard },
                    { title: "Mobile Money", detail: "MTN MoMo · Telecel Cash · AT Money", icon: Smartphone },
                    { title: "Bank Transfer", detail: "Pay from your bank account", icon: Building2 },
                  ].map((method) => <div key={method.title} aria-disabled="true" className="flex items-start gap-3 py-4"><method.icon size={22} className="mt-1 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{method.title}</p><p className="mt-1 text-xs text-muted-foreground">{method.detail}</p></div><span className="shrink-0 rounded bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">Coming soon</span></div>)}
                </div>}

                {/* COD */}
                <Button variant="ghost"
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
                    "relative flex h-auto w-full justify-start items-start gap-3.5 whitespace-normal rounded-lg border-2 px-4 py-3.5 text-left transition",
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
                </Button>
              </div>
            </section>

            {/* ---- Coupon ---- */}
            <section className={cn("border-y border-border bg-card", mobileStep !== "payment" && "hidden md:block")}>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 md:px-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <TicketPercent size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-normal">Coupon Code</h2>
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
                    <Button variant="ghost"
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponInput("");
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/10"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm uppercase tracking-wide outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <Button variant="ghost"
                      type="button"
                      onClick={applyCoupon}
                      disabled={checkingCoupon || !couponInput.trim()}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {checkingCoupon && <Loader2 size={14} className="animate-spin" />}
                      Apply
                    </Button>
                  </div>
                )}
              </div>
            </section>

            {/* Mobile-only order summary (appears above sticky bar) */}
            <section className={cn("border-y border-border bg-card md:hidden", mobileStep !== "payment" && "hidden")}>
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

              <Button variant="ghost"
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
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck size={12} className="text-success" />
                Secure checkout · SSL encrypted
              </p>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="mb-3 flex items-center justify-between"><span className="text-sm text-muted-foreground">Total ({itemCount} items)</span><span className="text-lg font-bold">{formatGHC(grand)}</span></div>
          {mobileStep === "delivery" ? <Button className="h-12 w-full" disabled={paying || saveAddress.isPending} onClick={() => {
            if (!selected || showForm) { toast.info("Save your delivery address to continue"); document.getElementById("address-section")?.scrollIntoView({ behavior: "smooth" }); return; }
            if (deliveryType === "pickup" && !pickupStation) { toast.info("Choose a pickup station to continue"); document.getElementById("delivery-section")?.scrollIntoView({ behavior: "smooth" }); return; }
            setMobileStep("payment"); window.scrollTo({ top: 0, behavior: "instant" });
          }}>Continue to Payment<ChevronRight size={16} /></Button> : <>
            {blocker && <p className="mb-2 text-xs text-danger-ink">{blocker}</p>}
            <Button onClick={pay} disabled={paying || !!blocker} className="h-12 w-full">{paying ? <><Loader2 size={18} className="animate-spin" />Processing…</> : <><Lock size={16} />{paymentMethod === "cod" ? "Confirm Order · Pay on Delivery" : "Pay Securely"}</>}</Button>
          </>}
        </div>
      </div>

      {/* OTP modal (kept from original) */}
      {otpPhone && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
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
              className="mt-4 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-center text-lg font-semibold tracking-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-4 flex gap-2">
              <Button variant="ghost"
                type="button"
                onClick={() => {
                  setOtpPhone(null);
                  setOtpCode("");
                }}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold"
              >
                Cancel
              </Button>
              <Button variant="ghost"
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
              </Button>
            </div>
            <Button variant="ghost"
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
            </Button>
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
      <Button variant="ghost" type="button" onClick={onSelect} className="flex h-auto w-full justify-start gap-3 whitespace-normal p-3.5 text-left">
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
      </Button>
      <div className="flex justify-end border-t border-border/60 px-3 py-1.5">
        <Button variant="ghost"
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={12} /> Remove
        </Button>
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
