import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Phone, MessageCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatGHC } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

const STATUSES = [
  "pending_payment",
  "placed",
  "pending_confirmation",
  "waiting_to_be_shipped",
  "shipped",
  "available_for_pickup",
  "delivered",
  "cancelled",
];

const TABS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "refunds", label: "Refunds needed" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function matchTab(o: any, t: Tab) {
  switch (t) {
    case "all": return true;
    case "new": return ["placed", "pending_confirmation", "pending_payment"].includes(o.status);
    case "processing": return o.status === "waiting_to_be_shipped";
    case "shipped": return ["shipped", "available_for_pickup"].includes(o.status);
    case "delivered": return o.status === "delivered";
    case "cancelled": return o.status === "cancelled";
    case "refunds": return o.refund_status === "pending";
  }
}

function waLink(phone?: string | null) {
  const d = String(phone ?? "").replace(/\D/g, "");
  const intl = d.startsWith("0") ? "233" + d.slice(1) : d;
  return `https://wa.me/${intl}`;
}

function AdminOrders() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*, order_items(id, name, qty, price, image_url, seller_id, fulfillment_status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = [...new Set((orders ?? []).map((o) => o.user_id))];
      const sellerIds = [...new Set((orders ?? []).flatMap((o: any) => o.order_items.map((i: any) => i.seller_id)).filter(Boolean))];
      const [{ data: profiles }, { data: shops }] = await Promise.all([
        ids.length ? supabase.from("profiles").select("id, email, display_name").in("id", ids) : Promise.resolve({ data: [] as any[] }),
        sellerIds.length ? supabase.from("seller_profiles").select("user_id, shop_name").in("user_id", sellerIds as string[]) : Promise.resolve({ data: [] as any[] }),
      ]);
      const pm = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const sm = new Map((shops ?? []).map((s: any) => [s.user_id, s.shop_name]));
      return (orders ?? []).map((o: any) => ({
        ...o,
        profile: pm.get(o.user_id),
        order_items: o.order_items.map((i: any) => ({ ...i, shop: sm.get(i.seller_id) })),
      }));
    },
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of TABS) c[t.key] = (data ?? []).filter((o) => matchTab(o, t.key)).length;
    return c;
  }, [data]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((o) => matchTab(o, tab)).filter((o) =>
      !s ||
      [o.order_number, o.delivery_name, o.delivery_phone, o.profile?.email, o.profile?.display_name]
        .some((v) => String(v ?? "").toLowerCase().includes(s))
    );
  }, [data, tab, q]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-orders"] });

  const setStatus = async (o: any, status: string) => {
    if (status === "cancelled" && !confirm(`Cancel order #${o.order_number}?`)) return;
    const patch: any = { status };
    if (status === "cancelled") {
      patch.cancelled_at = new Date().toISOString();
      patch.cancelled_by = "admin";
      if (o.payment_status === "paid" && o.payment_method !== "cod") patch.refund_status = "pending";
    }
    const { error } = await supabase.from("orders").update(patch).eq("id", o.id);
    if (error) return toast.error(error.message);
    // keep seller item status in sync with the order
    const itemStatus = status === "shipped" ? "shipped" : status === "delivered" ? "delivered" : null;
    if (itemStatus) {
      await supabase.from("order_items").update({ fulfillment_status: itemStatus }).eq("order_id", o.id);
    }
    toast.success("Status updated");
    refresh();
  };

  const markRefunded = async (o: any) => {
    const note = prompt("Refund reference / note (e.g. MoMo transaction ID):", "") ?? null;
    if (note === null) return;
    const { error } = await supabase
      .from("orders")
      .update({ refund_status: "refunded", refunded_at: new Date().toISOString(), refund_note: note || null })
      .eq("id", o.id);
    if (error) return toast.error(error.message);
    await supabase.from("inbox_messages").insert({
      user_id: o.user_id,
      title: "Refund completed",
      body: `Your refund of ${formatGHC(Number(o.total))} for order #${o.order_number} has been sent.${note ? " Ref: " + note : ""}`,
    });
    toast.success("Marked as refunded");
    refresh();
  };

  return (
    <div className="p-3 space-y-3 max-w-4xl mx-auto">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search order #, name, phone or email"
          className="w-full rounded-lg border border-border bg-card text-foreground pl-9 pr-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold border ${
              tab === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
            }`}
          >
            {t.label} ({counts[t.key] ?? 0})
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading orders…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load orders: {(error as Error).message}</p>}
      {!isLoading && list.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No orders here.</p>}

      {list.map((o: any) => (
        <div key={o.id} className="p-3 bg-card border border-border rounded-xl">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm">#{o.order_number}</p>
              <p className="text-xs text-muted-foreground truncate">{o.profile?.display_name ?? o.delivery_name} · {o.profile?.email ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <p className="font-bold">{formatGHC(Number(o.total))}</p>
              <div className="flex gap-1 justify-end flex-wrap">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground">
                  {o.payment_method === "cod" ? "COD" : "ONLINE"}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${o.payment_status === "paid" ? "bg-success text-success-foreground" : o.payment_status === "failed" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {String(o.payment_status ?? "pending").toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {o.refund_status === "pending" && (
            <div className="mt-2 p-2 rounded bg-warning-soft text-warning-ink text-xs flex items-center justify-between gap-2">
              <span>
                Refund {formatGHC(Number(o.total))} due within 2 working days
                {o.payment_reference ? ` · Ref ${o.payment_reference}` : ""}
                {o.cancelled_at ? ` · cancelled ${new Date(o.cancelled_at).toLocaleDateString()}` : ""}
              </span>
              <button onClick={() => markRefunded(o)} className="shrink-0 rounded bg-primary text-primary-foreground px-2 py-1 font-bold">
                Mark refunded
              </button>
            </div>
          )}
          {o.refund_status === "refunded" && (
            <p className="mt-2 text-xs text-success-ink bg-success-soft rounded p-2">
              Refunded {o.refunded_at ? new Date(o.refunded_at).toLocaleDateString() : ""}{o.refund_note ? ` · ${o.refund_note}` : ""}
            </p>
          )}
          {o.status === "cancelled" && o.cancelled_by && (
            <p className="mt-1 text-[11px] text-muted-foreground">Cancelled by {o.cancelled_by}</p>
          )}

          {o.delivery_name && (
            <div className="mt-2 p-2 bg-muted rounded text-xs space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {o.delivery_name} · {o.delivery_phone}
                  <span className="ml-2 text-[10px] uppercase font-bold text-primary">
                    {o.delivery_type === "pickup" ? "PICKUP" : "DOOR"}
                  </span>
                </p>
                {o.delivery_phone && (
                  <div className="flex gap-1 shrink-0">
                    <a href={`tel:${o.delivery_phone}`} aria-label="Call customer" className="p-1.5 rounded bg-card border border-border"><Phone size={14} /></a>
                    <a href={waLink(o.delivery_phone)} target="_blank" rel="noreferrer" aria-label="WhatsApp customer" className="p-1.5 rounded bg-card border border-border"><MessageCircle size={14} /></a>
                  </div>
                )}
              </div>
              {o.delivery_type === "pickup" && o.pickup_station && <p className="text-primary font-semibold">→ {o.pickup_station}</p>}
              <p className="text-muted-foreground">{o.delivery_address}, {o.delivery_city}, {o.delivery_region}</p>
              {o.delivery_notes && <p className="italic text-muted-foreground">Note: {o.delivery_notes}</p>}
            </div>
          )}

          <ul className="mt-2 space-y-1.5">
            {o.order_items?.map((i: any) => (
              <li key={i.id} className="flex items-center gap-2 text-xs">
                <div className="w-9 h-9 rounded bg-muted shrink-0 overflow-hidden">
                  {i.image_url && <img src={i.image_url} alt="" loading="lazy" className="w-full h-full object-contain" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-foreground">{i.qty}× {i.name}</p>
                  <p className="text-muted-foreground truncate">{i.shop ?? "Kivora"} · {formatGHC(Number(i.price) * i.qty)}</p>
                </div>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{i.fulfillment_status}</span>
              </li>
            ))}
          </ul>

          <select
            value={o.status}
            onChange={(e) => setStatus(o, e.target.value)}
            className="mt-2 w-full border border-border bg-card text-foreground rounded px-2 py-2 text-sm font-semibold"
            disabled={o.status === "cancelled" || (o.payment_status !== "paid" && o.status === "pending_payment")}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ").toUpperCase()}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
