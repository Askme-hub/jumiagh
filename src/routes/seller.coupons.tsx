import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TicketPercent, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatGHC } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/coupons")({
  component: SellerCoupons,
  head: () => ({ meta: [
    { title: "My Coupons — Kivora Seller Hub" },
    { name: "robots", content: "noindex" },
  ] }),
});

type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  value: number;
  min_spend: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

function SellerCoupons() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percent" as "percent" | "fixed",
    value: "",
    min_spend: "",
    max_uses: "",
    expires_at: "",
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["seller-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[]; // RLS scopes to this seller's own coupons
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sign in required");
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        value: Number(form.value),
        min_spend: form.min_spend ? Number(form.min_spend) : 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        seller_id: userData.user.id,
      };
      if (!payload.code || payload.code.length < 3) throw new Error("Code must be at least 3 characters");
      if (!payload.value || payload.value <= 0) throw new Error("Enter a valid discount value");
      if (payload.discount_type === "percent" && payload.value > 100) throw new Error("Percent cannot exceed 100");
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Coupon created — share the code with your customers");
      setShowForm(false);
      setForm({ code: "", discount_type: "percent", value: "", min_spend: "", max_uses: "", expires_at: "" });
      qc.invalidateQueries({ queryKey: ["seller-coupons"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not create coupon"),
  });

  const toggle = useMutation({
    mutationFn: async (c: Coupon) => {
      const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seller-coupons"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Coupon deleted"); qc.invalidateQueries({ queryKey: ["seller-coupons"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground">My Coupons</h1>
          <p className="text-xs text-muted-foreground">
            Discount codes for your shop only — they apply to your items in a customer's cart.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-full gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft"
        >
          <Plus size={14} /> {showForm ? "Close" : "New coupon"}
        </button>
      </div>

      {showForm && (
        <div className="dashboard-panel space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Code</span>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="MYSHOP10"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm uppercase"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Type</span>
              <select
                value={form.discount_type}
                onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as "percent" | "fixed" }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed amount (GH₵)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                Value {form.discount_type === "percent" ? "(%)" : "(GH₵)"}
              </span>
              <input
                type="number" min="0" step="0.01"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Min. spend (GH₵, optional)</span>
              <input
                type="number" min="0" step="0.01"
                value={form.min_spend}
                onChange={(e) => setForm((f) => ({ ...f, min_spend: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Max uses (optional)</span>
              <input
                type="number" min="1"
                value={form.max_uses}
                onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Expires (optional)</span>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="rounded-md bg-foreground px-5 py-2.5 text-sm font-bold text-background disabled:opacity-60"
          >
            {create.isPending ? "Creating…" : "Create coupon"}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
      ) : coupons.length === 0 ? (
        <div className="dashboard-panel flex flex-col items-center gap-2 p-10 text-center">
          <TicketPercent size={28} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No coupons yet</p>
          <p className="text-xs text-muted-foreground">Create a code and share it with your customers to boost sales.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => {
            const expired = c.expires_at && new Date(c.expires_at).getTime() < Date.now();
            const usedUp = c.max_uses != null && c.used_count >= c.max_uses;
            return (
              <div key={c.id} className="dashboard-panel flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-primary-soft px-2 py-0.5 text-sm font-extrabold tracking-wide text-primary">
                      {c.code}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {c.discount_type === "percent" ? `${c.value}% off` : `${formatGHC(c.value)} off`}
                    </span>
                    {expired && <span className="rounded-full bg-flash/10 px-2 py-0.5 text-[10px] font-bold text-flash">Expired</span>}
                    {usedUp && <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">Fully used</span>}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Used {c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""} times
                    {c.min_spend > 0 && ` · min spend ${formatGHC(c.min_spend)}`}
                    {c.expires_at && ` · expires ${new Date(c.expires_at).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => toggle.mutate(c)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                    c.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.active ? "Active" : "Disabled"}
                </button>
                <button
                  onClick={() => { if (confirm(`Delete coupon ${c.code}?`)) remove.mutate(c.id); }}
                  aria-label={`Delete coupon ${c.code}`}
                  className="rounded-full p-2 text-muted-foreground transition hover:bg-flash/10 hover:text-flash"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
