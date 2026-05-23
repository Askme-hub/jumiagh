import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ChevronRight, MapPin, CreditCard, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { formatGHC, useShop } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { initiatePaystackCheckout } from "@/lib/paystack.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Checkout – Jumia Ghana" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
});

const GH_REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Volta", "Northern", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Western North", "Oti", "Savannah", "North East",
];

const Schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20).regex(/^[0-9+\-\s()]+$/, "Digits only"),
  region: z.string().min(2, "Select a region"),
  city: z.string().trim().min(2, "Enter a city").max(80),
  address: z.string().trim().min(5, "Enter a delivery address").max(500),
  notes: z.string().trim().max(500).optional(),
});

const STORAGE_KEY = "jm_delivery_v1";

function Checkout() {
  const router = useRouter();
  const cart = useShop((s) => s.cart);
  const clearCart = useShop((s) => s.clearCart);
  const total = useShop((s) => s.cartTotal());
  const itemCount = cart.reduce((a, c) => a + c.qty, 0);
  const shipping = total >= 150 ? 0 : 15;
  const grand = total + shipping;
  const initCheckout = useServerFn(initiatePaystackCheckout);

  const [form, setForm] = useState({
    name: "", phone: "", region: "Greater Accra", city: "", address: "", notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setForm((f) => ({ ...f, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  useEffect(() => {
    if (cart.length === 0 && !paying) {
      router.navigate({ to: "/cart" });
    }
  }, [cart.length, paying, router]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const pay = async () => {
    const parsed = Schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      toast.error("Please complete delivery details");
      return;
    }
    setPaying(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.data));
      const res = await initCheckout({
        data: {
          callbackOrigin: window.location.origin,
          delivery: parsed.data,
          items: cart.map((c) => ({
            product_id: c.product.id,
            name: c.product.name,
            price: Number(c.product.price),
            old_price: c.product.oldPrice ?? null,
            image_url: c.product.image ?? null,
            qty: c.qty,
          })),
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

      <section className="bg-card mt-2">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
          <MapPin size={18} className="text-primary" />
          <h2 className="font-bold">Delivery Address</h2>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Full name" value={form.name} onChange={(v) => set("name", v)} error={errors.name} placeholder="Kwame Mensah" />
          <Field label="Phone number" value={form.phone} onChange={(v) => set("phone", v)} error={errors.phone} placeholder="024 000 0000" type="tel" inputMode="tel" />
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Region</label>
            <select
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
              className="w-full border border-border rounded px-3 py-2.5 bg-background text-sm"
            >
              {GH_REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            {errors.region && <p className="text-destructive text-xs mt-1">{errors.region}</p>}
          </div>
          <Field label="City / Town" value={form.city} onChange={(v) => set("city", v)} error={errors.city} placeholder="Accra" />
          <Field label="Delivery address" value={form.address} onChange={(v) => set("address", v)} error={errors.address} placeholder="House no., street, landmark" textarea />
          <Field label="Additional notes (optional)" value={form.notes} onChange={(v) => set("notes", v)} error={errors.notes} placeholder="Gate code, time window…" textarea />
        </div>
      </section>

      <section className="bg-card mt-2">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
          <CreditCard size={18} className="text-primary" />
          <h2 className="font-bold">Payment Method</h2>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Paystack</p>
            <p className="text-xs text-muted-foreground">Card, Mobile Money, Bank — secured by Paystack</p>
          </div>
          <span className="text-xs font-bold bg-success/10 text-success px-2 py-1 rounded">SELECTED</span>
        </div>
      </section>

      <section className="bg-card mt-2">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-bold">Order Summary</h2>
          <Link to="/cart" className="text-xs text-primary font-semibold">Edit</Link>
        </div>
        <div className="px-4 py-3 space-y-2 text-sm">
          <Row label={`Items (${itemCount})`} value={formatGHC(total)} />
          <Row label="Delivery fee" value={shipping === 0 ? "FREE" : formatGHC(shipping)} />
          <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
            <span>Total</span><span>{formatGHC(grand)}</span>
          </div>
        </div>
      </section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground px-4 py-3">
        <ShieldCheck size={14} className="text-success" />
        Your payment is encrypted and securely processed by Paystack.
      </p>

      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-card border-t border-border p-3 z-40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="font-bold text-lg">{formatGHC(grand)}</span>
        </div>
        <button
          onClick={pay}
          disabled={paying || cart.length === 0}
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-md disabled:opacity-60"
        >
          {paying ? "Redirecting to Paystack…" : `Pay ${formatGHC(grand)}`}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
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
