import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bike, Phone, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { confirmReceived } from "@/lib/push.functions";

const ISSUE_KINDS = [
  { v: "return", l: "I want to return it" },
  { v: "damaged", l: "Item arrived damaged" },
  { v: "wrong_item", l: "Wrong item delivered" },
  { v: "not_received", l: "Marked delivered but not received" },
  { v: "other", l: "Something else" },
] as const;

export function OrderTracking({ orderId, userId }: { orderId: string; userId: string }) {
  const qc = useQueryClient();
  const confirm = useServerFn(confirmReceived);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>("return");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const [{ data: items }, { data: issues }, { data: hist }] = await Promise.all([
        supabase.from("order_items").select("id, name, fulfillment_status, rider_name, rider_phone, tracking_note, escrow_released, escrow_release_at").eq("order_id", orderId),
        supabase.from("order_issues").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
        supabase.from("order_status_history").select("created_at").eq("order_id", orderId).eq("status", "delivered").order("created_at", { ascending: false }).limit(1),
      ]);
      return { items: items ?? [], issues: issues ?? [], deliveredAt: hist?.[0]?.created_at as string | undefined };
    },
    refetchInterval: 15000,
  });
  if (!data || data.items.length === 0) return null;

  const shipped = data.items.filter((i) => i.fulfillment_status === "shipped" && (i.rider_name || i.rider_phone || i.tracking_note));
  const delivered = data.items.filter((i) => i.fulfillment_status === "delivered");
  const awaitingConfirm = delivered.some((i) => !i.escrow_released);
  // Buyers can report an issue for 7 days after delivery (COD and online).
  const deliveredAt = data.deliveredAt ? new Date(data.deliveredAt).getTime() : Date.now();
  const withinWindow = delivered.length > 0 && Date.now() < deliveredAt + 7 * 24 * 3600_000;
  const openIssue = data.issues.find((i) => i.status === "open");

  const doConfirm = async () => {
    setBusy(true);
    try {
      await confirm({ data: { orderId } });
      toast.success("Thanks! Receipt confirmed.");
      qc.invalidateQueries({ queryKey: ["order-tracking", orderId] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const report = async () => {
    if (desc.trim().length < 5) return toast.error("Please describe the problem.");
    setBusy(true);
    const { error } = await supabase.from("order_issues").insert({ order_id: orderId, user_id: userId, kind, description: desc.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Issue reported. Our team will contact you.");
    setOpen(false); setDesc("");
    qc.invalidateQueries({ queryKey: ["order-tracking", orderId] });
  };

  return (
    <div className="bg-card mt-2 border-b border-border px-4 py-4 space-y-3">
      {shipped.map((i) => (
        <div key={i.id} className="flex items-start gap-3 rounded-lg bg-info-soft p-3">
          <Bike size={18} className="text-info-ink mt-0.5 shrink-0" />
          <div className="text-sm min-w-0">
            <p className="font-bold text-info-ink">{i.name} is on its way</p>
            {i.rider_name && <p className="text-foreground">Rider: {i.rider_name}</p>}
            {i.tracking_note && <p className="text-muted-foreground text-xs">{i.tracking_note}</p>}
            {i.rider_phone && (
              <a href={`tel:${i.rider_phone}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <Phone size={12} /> Call rider {i.rider_phone}
              </a>
            )}
          </div>
        </div>
      ))}

      {delivered.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {awaitingConfirm && !openIssue && (
            <button onClick={doConfirm} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              <CheckCircle2 size={14} /> I received my order
            </button>
          )}
          {(withinWindow || awaitingConfirm) && !openIssue && (
            <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold">
              <AlertTriangle size={14} /> Report an issue / return
            </button>
          )}
        </div>
      )}
      {awaitingConfirm && !openIssue && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck size={12} /> Your payment is held safely for 48 hours after delivery before the seller is paid.
        </p>
      )}

      {open && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
            {ISSUE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
          </select>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} rows={3} placeholder="Tell us what happened…" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={report} disabled={busy} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Submit</button>
        </div>
      )}

      {data.issues.map((i) => (
        <div key={i.id} className={`rounded-lg p-3 text-sm ${i.status === "open" ? "bg-warning-soft text-warning-ink" : i.status === "resolved" ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink"}`}>
          <p className="font-bold">Issue {i.status === "open" ? "under review" : i.status}</p>
          <p className="text-xs">{i.description}</p>
          {i.admin_note && <p className="mt-1 text-xs">Kivora: {i.admin_note}</p>}
        </div>
      ))}
    </div>
  );
}
