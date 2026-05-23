import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

function AdminOrders() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, profiles(email, display_name), order_items(name, qty)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    }
  };

  return (
    <div>
      <p className="p-3 text-sm text-muted-foreground">{data?.length ?? 0} orders</p>
      {data?.map((o: any) => (
        <div key={o.id} className="p-3 bg-card border-b border-border">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <p className="font-bold text-sm">#{o.order_number}</p>
              <p className="text-xs text-muted-foreground truncate">{o.profiles?.email ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatGHC(Number(o.total))}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${o.payment_status === "paid" ? "bg-success text-white" : o.payment_status === "failed" ? "bg-destructive text-white" : "bg-secondary"}`}>
                {String(o.payment_status ?? "pending").toUpperCase()}
              </span>
            </div>
          </div>

          {o.delivery_name && (
            <div className="mt-2 p-2 bg-muted rounded text-xs space-y-0.5">
              <p className="font-semibold">{o.delivery_name} · {o.delivery_phone}</p>
              <p className="text-muted-foreground">{o.delivery_address}, {o.delivery_city}, {o.delivery_region}</p>
              {o.delivery_notes && <p className="italic text-muted-foreground">Note: {o.delivery_notes}</p>}
            </div>
          )}

          <p className="text-xs mt-2 text-foreground/80 line-clamp-2">
            {o.order_items?.map((i: any) => `${i.qty}× ${i.name}`).join(", ")}
          </p>
          <select
            value={o.status}
            onChange={(e) => setStatus(o.id, e.target.value)}
            className="mt-2 w-full border rounded px-2 py-2 text-sm font-semibold"
            disabled={o.payment_status !== "paid" && o.status === "pending_payment"}
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
