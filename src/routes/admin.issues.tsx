import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/issues")({
  component: AdminIssues,
  head: () => ({ meta: [{ title: "Order Issues — Kivora Admin" }, { name: "robots", content: "noindex" }] }),
});

const KIND: Record<string, string> = {
  return: "Return request", damaged: "Damaged", wrong_item: "Wrong item", not_received: "Not received", other: "Other",
};

function AdminIssues() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-issues", filter],
    queryFn: async () => {
      let q = supabase.from("order_issues").select("*, orders(order_number, delivery_name, delivery_phone)").order("created_at", { ascending: false });
      if (filter === "open") q = q.eq("status", "open");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const resolve = async (id: string, status: "resolved" | "rejected") => {
    const { error } = await supabase.from("order_issues").update({ status, admin_note: notes[id] || null, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Issue ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-issues"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-bold flex-1">Order issues & returns</h1>
        {(["open", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "border border-border"}`}>
            {f === "open" ? "Open" : "All"}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">While an issue is open, the seller's payment for that order stays in escrow.</p>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && data.length === 0 && <p className="text-sm text-muted-foreground">No issues to review.</p>}
      {data.map((i: any) => (
        <div key={i.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-warning-soft text-warning-ink px-2 py-0.5 text-xs font-bold">{KIND[i.kind] ?? i.kind}</span>
            <Link to="/orders/$id" params={{ id: i.order_id }} className="text-sm font-semibold text-primary">Order #{i.orders?.order_number}</Link>
            <span className="text-xs text-muted-foreground ml-auto">{new Date(i.created_at).toLocaleString()}</span>
          </div>
          <p className="text-sm">{i.description}</p>
          <p className="text-xs text-muted-foreground">{i.orders?.delivery_name} · {i.orders?.delivery_phone}</p>
          {i.status === "open" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={notes[i.id] ?? ""} onChange={(e) => setNotes({ ...notes, [i.id]: e.target.value })} placeholder="Note to customer (optional)" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <button onClick={() => resolve(i.id, "resolved")} className="rounded-full bg-success-soft text-success-ink px-4 py-2 text-xs font-bold">Resolve</button>
              <button onClick={() => resolve(i.id, "rejected")} className="rounded-full bg-danger-soft text-danger-ink px-4 py-2 text-xs font-bold">Reject</button>
            </div>
          ) : (
            <p className="text-xs font-semibold capitalize">{i.status}{i.admin_note ? ` — ${i.admin_note}` : ""}</p>
          )}
        </div>
      ))}
    </div>
  );
}
